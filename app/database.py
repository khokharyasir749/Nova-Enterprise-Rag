import logging
from typing import Optional, List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    PayloadSchemaType,
    Filter,
    FieldCondition,
    MatchValue,
    MatchAny,
)
from app.config import settings

logger = logging.getLogger(__name__)

_qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """Return a singleton QdrantClient instance."""
    global _qdrant_client
    if _qdrant_client is None:
        logger.info(f"Connecting to Qdrant at {settings.QDRANT_HOST}:{settings.QDRANT_PORT}...")
        _qdrant_client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
    return _qdrant_client


def ensure_collection_exists(client: Optional[QdrantClient] = None) -> None:
    """
    Ensure the Qdrant collection 'enterprise_tenant_chunks' exists.
    Configured with vector size 384 and Cosine distance metric.
    Creates keyword payload indexes for tenant_id, allowed_roles, and doc_name for fast filtering.
    """
    if client is None:
        client = get_qdrant_client()

    collection_name = settings.QDRANT_COLLECTION_NAME

    try:
        exists = client.collection_exists(collection_name=collection_name)
    except Exception as e:
        logger.warning(f"Error checking if collection exists (will attempt creation): {e}")
        exists = False

    if not exists:
        logger.info(
            f"Collection '{collection_name}' does not exist. Creating with "
            f"vector_size={settings.VECTOR_SIZE}, distance=Cosine..."
        )
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=settings.VECTOR_SIZE,
                distance=Distance.COSINE
            ),
        )
        logger.info(f"Collection '{collection_name}' created successfully.")

        # Create payload indexes on tenant_id, allowed_roles, and doc_name
        for field in ["tenant_id", "allowed_roles", "doc_name"]:
            try:
                client.create_payload_index(
                    collection_name=collection_name,
                    field_name=field,
                    field_schema=PayloadSchemaType.KEYWORD,
                )
                logger.info(f"Payload index for '{field}' created.")
            except Exception as idx_err:
                logger.warning(f"Could not create payload index for '{field}': {idx_err}")
    else:
        logger.info(f"Collection '{collection_name}' already exists.")
        # Ensure doc_name payload index exists even on existing collection
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name="doc_name",
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass


def get_documents_by_tenant(tenant_id: str, client: Optional[QdrantClient] = None) -> List[Dict[str, Any]]:
    """
    Scroll points for a specific tenant in Qdrant and aggregate by doc_name.
    Returns unique documents with doc_name, tenant_id, allowed_roles, chunk_count, and uploaded_at.
    """
    if client is None:
        client = get_qdrant_client()

    clean_tenant_id = tenant_id.strip().lower()
    raw_tenant_id = tenant_id.strip()
    collection_name = settings.QDRANT_COLLECTION_NAME

    tenant_candidates = list(dict.fromkeys([clean_tenant_id, raw_tenant_id]))
    docs_map: Dict[str, Dict[str, Any]] = {}
    offset = None

    while True:
        try:
            records, next_offset = client.scroll(
                collection_name=collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="tenant_id",
                            match=MatchAny(any=tenant_candidates),
                        )
                    ]
                ),
                limit=250,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
        except Exception as e:
            logger.error(f"Error scrolling documents for tenant '{clean_tenant_id}': {e}")
            break

        if not records:
            break

        for record in records:
            payload = record.payload or {}
            d_name = payload.get("doc_name", "unknown")
            created_at = payload.get("created_at") or ""
            allowed_roles = payload.get("allowed_roles") or []

            if d_name not in docs_map:
                docs_map[d_name] = {
                    "doc_name": d_name,
                    "tenant_id": payload.get("tenant_id") or clean_tenant_id,
                    "allowed_roles": allowed_roles,
                    "chunk_count": 1,
                    "uploaded_at": created_at,
                }
            else:
                docs_map[d_name]["chunk_count"] += 1
                if created_at and (not docs_map[d_name]["uploaded_at"] or created_at > docs_map[d_name]["uploaded_at"]):
                    docs_map[d_name]["uploaded_at"] = created_at
                if allowed_roles:
                    docs_map[d_name]["allowed_roles"] = allowed_roles

        if next_offset is None:
            break
        offset = next_offset

    return sorted(list(docs_map.values()), key=lambda x: x["doc_name"].lower())


def update_document_roles(
    tenant_id: str,
    doc_name: str,
    allowed_roles: List[str],
    client: Optional[QdrantClient] = None
) -> None:
    """
    Update the allowed_roles payload field in Qdrant for ALL points/chunks of the specified document.
    """
    if client is None:
        client = get_qdrant_client()

    clean_tenant_id = tenant_id.strip().lower()
    raw_tenant_id = tenant_id.strip()
    clean_doc_name = doc_name.strip()
    clean_roles = [r.strip().lower() for r in allowed_roles if r.strip()]
    if not clean_roles:
        clean_roles = ["admin"]

    collection_name = settings.QDRANT_COLLECTION_NAME
    tenant_candidates = list(dict.fromkeys([clean_tenant_id, raw_tenant_id]))

    filter_selector = Filter(
        must=[
            FieldCondition(key="tenant_id", match=MatchAny(any=tenant_candidates)),
            FieldCondition(key="doc_name", match=MatchValue(value=clean_doc_name)),
        ]
    )

    client.set_payload(
        collection_name=collection_name,
        payload={"allowed_roles": clean_roles},
        points=filter_selector,
        wait=True,
    )
    logger.info(f"Updated allowed_roles to {clean_roles} for doc '{clean_doc_name}' (tenant: '{clean_tenant_id}').")


def delete_document(
    tenant_id: str,
    doc_name: str,
    client: Optional[QdrantClient] = None
) -> None:
    """
    Delete all points/chunks belonging to the specified document from Qdrant.
    """
    if client is None:
        client = get_qdrant_client()

    clean_tenant_id = tenant_id.strip().lower()
    raw_tenant_id = tenant_id.strip()
    clean_doc_name = doc_name.strip()
    collection_name = settings.QDRANT_COLLECTION_NAME

    tenant_candidates = list(dict.fromkeys([clean_tenant_id, raw_tenant_id]))

    filter_selector = Filter(
        must=[
            FieldCondition(key="tenant_id", match=MatchAny(any=tenant_candidates)),
            FieldCondition(key="doc_name", match=MatchValue(value=clean_doc_name)),
        ]
    )

    client.delete(
        collection_name=collection_name,
        points_selector=filter_selector,
        wait=True,
    )
    logger.info(f"Deleted all chunks for document '{clean_doc_name}' (tenant: '{clean_tenant_id}').")

