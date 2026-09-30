import logging
from typing import Any, Dict, List, Optional
from qdrant_client.models import FieldCondition, Filter, MatchAny, MatchValue

from app.config import settings
from app.database import get_qdrant_client
from app.embeddings import get_embedding_model

logger = logging.getLogger(__name__)


def retrieve_context_chunks(
    query: str,
    tenant_id: str,
    user_roles: List[str],
    top_k: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve document chunks from Qdrant with strict pre-LLM security filtering.

    Enforces that:
    1. chunk.payload.tenant_id == requester.tenant_id
    2. Any role in requester.user_roles is present in chunk.payload.allowed_roles

    If no chunks match the security filter, returns an empty list without calling the LLM.

    Args:
        query: User's question or search query string.
        tenant_id: Requester's tenant identifier.
        user_roles: List of requester's active roles.
        top_k: Optional limit on number of retrieved chunks (defaults to settings.TOP_K).

    Returns:
        List of matching chunk dictionaries containing content, doc_name, score, and payload.
    """
    clean_tenant_id = tenant_id.strip().lower()
    clean_roles = [r.strip().lower() for r in user_roles if r.strip()]
    limit = top_k or settings.TOP_K

    if not clean_roles:
        logger.warning(f"User for tenant '{clean_tenant_id}' has no valid roles. Returning empty context.")
        print(f"\n[RETRIEVAL] Tenant '{clean_tenant_id}' has no active roles specified. Blocked.")
        return []

    # 1. Encode query into vector
    model = get_embedding_model()
    query_vector = model.encode(query, normalize_embeddings=True).tolist()

    # 2. Construct strict pre-LLM security filter
    security_filter = Filter(
        must=[
            FieldCondition(
                key="tenant_id",
                match=MatchValue(value=clean_tenant_id),
            ),
            FieldCondition(
                key="allowed_roles",
                match=MatchAny(any=clean_roles),
            ),
        ]
    )

    logger.info(
        f"Executing vector search with strict security filter: tenant='{clean_tenant_id}', "
        f"roles={clean_roles}, top_k={limit}"
    )

    # 3. Query Qdrant with pre-filtering and score threshold
    client = get_qdrant_client()
    try:
        response = client.query_points(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            query=query_vector,
            query_filter=security_filter,
            limit=limit,
            score_threshold=settings.SCORE_THRESHOLD,
        )
        hits = response.points
    except AttributeError:
        hits = client.search(
            collection_name=settings.QDRANT_COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=security_filter,
            limit=limit,
            score_threshold=settings.SCORE_THRESHOLD,
        )
    except Exception as e:
        logger.error(f"Error querying Qdrant: {e}", exc_info=True)
        raise

    # 4. Print retrieved points and similarity scores in console
    print(f"\n==================== [QDRANT RETRIEVAL DEBUG] ====================")
    print(f" Query:   \"{query}\"")
    print(f" Tenant:  '{clean_tenant_id}' | Roles: {clean_roles} | Top_K: {limit}")
    if not hits:
        print(" [RESULT] 0 points matched pre-LLM security filter (No accessible chunks).")
    else:
        print(f" [RESULT] {len(hits)} matching point(s) found in collection '{settings.QDRANT_COLLECTION_NAME}':")
        for idx, hit in enumerate(hits, start=1):
            score = getattr(hit, "score", 0.0)
            payload = hit.payload or {}
            doc_name = payload.get("doc_name", "unknown_document")
            allowed_roles = payload.get("allowed_roles", [])
            content_snippet = payload.get("content", "").strip()[:90].replace("\n", " ")
            print(f"   ({idx}) Score: {score:.4f} | Doc: '{doc_name}' | Roles: {allowed_roles}")
            print(f"       Snippet: \"{content_snippet}...\"")
    print(f"==================================================================\n", flush=True)

    if not hits:
        logger.info(
            f"Pre-LLM security filter matched 0 chunks for tenant='{clean_tenant_id}' "
            f"with roles={clean_roles}."
        )
        return []

    # 5. Format retrieved chunks
    retrieved_chunks: List[Dict[str, Any]] = []
    for hit in hits:
        score = getattr(hit, "score", 0.0)
        payload = hit.payload or {}
        retrieved_chunks.append({
            "id": str(hit.id),
            "score": score,
            "content": payload.get("content", ""),
            "doc_name": payload.get("doc_name", "unknown_document"),
            "tenant_id": payload.get("tenant_id", ""),
            "allowed_roles": payload.get("allowed_roles", []),
            "created_at": payload.get("created_at", ""),
        })

    logger.info(
        f"Successfully retrieved {len(retrieved_chunks)} authorized chunks "
        f"for tenant '{clean_tenant_id}'."
    )
    return retrieved_chunks
