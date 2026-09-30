import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, File, Form, HTTPException, Query, Request, UploadFile, status
from qdrant_client.models import PointStruct

from app.config import settings
from app.database import (
    get_qdrant_client,
    ensure_collection_exists,
    get_documents_by_tenant,
    update_document_roles,
    delete_document,
)
from app.embeddings import generate_embeddings
from app.ingestion import parse_and_chunk_document
from app.retrieval import retrieve_context_chunks
from app.generation import generate_augmented_answer, is_conversational_query, NO_ACCESS_MESSAGE
from app.audit import audit_logger
from app.models import (
    UploadResponse,
    UploadResponseData,
    QueryRequest,
    QueryResponse,
    AuditLogResponse,
    CompanyRegisterRequest,
    CompanyRegisterResponse,
    CompanyVerifyRequest,
    CompanyVerifyResponse,
    CompanyListResponse,
    CompanyPublicInfo,
    CompanyLogoUpdateRequest,
    CompanyLogoUpdateResponse,
    DocumentItem,
    DocumentListResponse,
    DocumentRolesUpdateRequest,
    DocumentRolesUpdateResponse,
    DocumentDeleteRequest,
    DocumentDeleteResponse,
)
from app.companies import register_company, verify_company_access, get_public_companies, update_company_logo

router = APIRouter(prefix="/api", tags=["Multi-Tenant RAG"])
logger = logging.getLogger(__name__)


# ============================================================================
# Ingestion Endpoint (Step 1)
# ============================================================================

@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a document with permission metadata",
    description="Parses PDF or TXT files, splits text into chunks, computes embeddings, and stores vectors with tenant_id and allowed_roles in Qdrant."
)
async def upload_document(
    file: UploadFile = File(..., description="PDF or TXT document to ingest"),
    tenant_id: str = Form(..., description="Tenant ID (e.g. 'company_a')"),
    allowed_roles: str = Form(..., description='JSON string array of roles (e.g. \'["admin", "hr"]\')'),
):
    # 1. Validate tenant_id
    clean_tenant_id = tenant_id.strip().lower()
    if not clean_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tenant_id cannot be empty."
        )

    # 2. Parse and validate allowed_roles JSON string
    try:
        raw_roles = json.loads(allowed_roles)
        if not isinstance(raw_roles, list):
            raise ValueError("Must be a JSON array")
        clean_allowed_roles = [
            str(r).strip().lower()
            for r in raw_roles
            if str(r).strip()
        ]
        if not clean_allowed_roles:
            raise ValueError("Must contain at least one non-empty role string")
    except (json.JSONDecodeError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid allowed_roles format. Expected a valid JSON array of role strings, e.g. '[\"admin\", \"hr\"]'. Error: {err}"
        )

    # 3. Validate file extension
    doc_name = file.filename or "unknown_file"
    lower_name = doc_name.lower()
    if not (lower_name.endswith(".pdf") or lower_name.endswith(".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{doc_name}'. Only .pdf and .txt files are supported."
        )

    # 4. Read file content
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file '{doc_name}' is empty."
            )
    except Exception as e:
        logger.error(f"Error reading uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file: {str(e)}"
        )

    # 5. Parse and chunk document
    try:
        chunks = parse_and_chunk_document(doc_name, file_bytes)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Parsing/chunking error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing document: {str(e)}"
        )

    total_chunks = len(chunks)
    logger.info(f"Generated {total_chunks} chunks for '{doc_name}' (tenant: {clean_tenant_id}).")

    # 6. Generate embeddings
    try:
        embeddings = generate_embeddings(chunks)
    except Exception as e:
        logger.error(f"Embedding generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {str(e)}"
        )

    # 7. Prepare Qdrant PointStruct objects
    client = get_qdrant_client()
    ensure_collection_exists(client)

    now_iso = datetime.now(timezone.utc).isoformat()
    points: List[PointStruct] = []

    for chunk_text, vector in zip(chunks, embeddings):
        point_id = str(uuid.uuid4())
        payload = {
            "tenant_id": clean_tenant_id,
            "allowed_roles": clean_allowed_roles,
            "doc_name": doc_name,
            "content": chunk_text,
            "created_at": now_iso,
        }
        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload=payload,
            )
        )

    # 8. Upsert points into Qdrant in batches
    batch_size = 64
    try:
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            client.upsert(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points=batch,
                wait=True,
            )
        logger.info(f"Successfully upserted {len(points)} points to '{settings.QDRANT_COLLECTION_NAME}'.")
    except Exception as e:
        logger.error(f"Failed to store vectors in Qdrant: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to save vectors into Qdrant collection: {str(e)}"
        )

    return UploadResponse(
        status="success",
        message="Document successfully parsed, chunked, embedded, and stored in vector database.",
        data=UploadResponseData(
            doc_name=doc_name,
            tenant_id=clean_tenant_id,
            allowed_roles=clean_allowed_roles,
            total_chunks=total_chunks,
        ),
    )


# ============================================================================
# Retrieval & Query Endpoint (Step 2)
# ============================================================================

@router.post(
    "/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query RAG knowledge base with strict pre-LLM security filtering",
    description=(
        "Executes a vector search enforcing tenant isolation and role matching BEFORE "
        "passing context to the generation engine. Returns permission denial without LLM call if unauthorized."
    )
)
async def query_knowledge_base(body: QueryRequest):
    # 1. Clean inputs
    clean_tenant_id = body.tenant_id.strip().lower()
    clean_roles = [r.strip().lower() for r in body.user_roles if r.strip()]

    if not clean_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_roles must contain at least one valid role string."
        )

    # 2. Strict Pre-LLM Vector Retrieval
    try:
        chunks = retrieve_context_chunks(
            query=body.query,
            tenant_id=clean_tenant_id,
            user_roles=clean_roles,
            top_k=settings.TOP_K,
        )
    except Exception as e:
        logger.error(f"Retrieval error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to query vector database: {str(e)}"
        )

    # 3. Determine access status & retrieved document list
    is_conv = is_conversational_query(body.query)
    if chunks:
        access_status = "GRANTED"
        retrieved_docs = list(dict.fromkeys(c.get("doc_name") for c in chunks if c.get("doc_name")))
    elif is_conv:
        access_status = "CONVERSATIONAL"
        retrieved_docs = []
    else:
        access_status = "DENIED / NO ACCESS"
        retrieved_docs = []

    # 4. Context Augmentation & Generation (Bypasses LLM if chunks is empty and not conversational)
    answer = generate_augmented_answer(
        query=body.query,
        chunks=chunks,
        tenant_id=clean_tenant_id,
        user_roles=clean_roles,
    )

    # 5. Audit Logging (Guaranteed to record both granted and denied attempts)
    audit_record = audit_logger.log_event(
        user_id=body.user_id,
        tenant_id=clean_tenant_id,
        user_roles=clean_roles,
        query=body.query,
        retrieved_chunks_count=len(chunks),
        retrieved_documents=retrieved_docs,
        access_status=access_status,
    )

    return QueryResponse(
        answer=answer,
        retrieved_documents=retrieved_docs,
        audit_log_id=audit_record.id,
    )


# ============================================================================
# Audit Logs Endpoint (Step 2)
# ============================================================================

@router.get(
    "/audit-logs",
    response_model=AuditLogResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve audit trail logs",
    description="Returns the latest permission-aware query audit records in reverse chronological order."
)
async def get_audit_trail(
    tenant_id: Optional[str] = Query(None, description="Filter audit logs by tenant ID"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of logs to return"),
):
    records = audit_logger.get_logs(tenant_id=tenant_id, limit=limit)
    return AuditLogResponse(
        total=len(records),
        logs=records,
    )


# ============================================================================
# Company & Access Code Security Endpoints
# ============================================================================

@router.post(
    "/companies/register",
    response_model=CompanyRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new company workspace",
    description="Registers a company with 3 distinct role-specific passkeys (Admin, HR, Employee), optional logo_url, and generates a unique tenant_id."
)
async def api_register_company(body: CompanyRegisterRequest):
    admin_key = (body.keys.admin if body.keys else body.admin_key) or body.access_code or ""
    hr_key = (body.keys.hr if body.keys else body.hr_key) or (f"{body.access_code}_hr" if body.access_code else "")
    employee_key = (body.keys.employee if body.keys else body.employee_key) or (f"{body.access_code}_emp" if body.access_code else "")

    try:
        company = register_company(
            name=body.name,
            admin_key=admin_key,
            hr_key=hr_key,
            employee_key=employee_key,
            logo_url=body.logo_url,
        )
        return CompanyRegisterResponse(
            status="success",
            message="Company registered successfully",
            data=CompanyPublicInfo(
                tenant_id=company["tenant_id"],
                name=company["name"],
                logo_url=company.get("logo_url", ""),
                created_at=company.get("created_at"),
            ),
            role="admin",
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error(f"Error registering company: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register company",
        )


@router.post(
    "/companies/verify",
    response_model=CompanyVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify company access code",
    description="Validates that the provided access code matches an Admin, HR, or Employee passkey for the company."
)
async def api_verify_company(body: CompanyVerifyRequest):
    company = verify_company_access(body.tenant_id, body.access_code)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access code or company workspace.",
        )
    return CompanyVerifyResponse(
        success=True,
        status="success",
        message="Access code verified successfully",
        tenant_id=company["tenant_id"],
        name=company["name"],
        role=company["role"],
        logo_url=company.get("logo_url", ""),
    )


@router.get(
    "/companies",
    response_model=CompanyListResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
@router.get(
    "/companies/list",
    response_model=CompanyListResponse,
    status_code=status.HTTP_200_OK,
    summary="List registered companies",
    description="Returns public company listings without disclosing secret access codes."
)
async def api_list_companies():
    companies = get_public_companies()
    return CompanyListResponse(
        total=len(companies),
        companies=[CompanyPublicInfo(**c) for c in companies],
    )


@router.post(
    "/companies/{tenant_id}/logo",
    response_model=CompanyLogoUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload or update company workspace logo",
    description="Accepts image URL, base64 data (JSON), or uploaded image file (multipart/form-data) and stores it in the company profile."
)
async def api_update_company_logo(
    tenant_id: str,
    request: Request,
):
    clean_tenant = tenant_id.strip().lower()
    content_type = request.headers.get("content-type", "")
    final_logo_url = ""

    if "application/json" in content_type:
        try:
            data = await request.json()
            final_logo_url = (data.get("logo_url") or "").strip()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON payload: {str(e)}"
            )
    elif "multipart/form-data" in content_type:
        try:
            form = await request.form()
            if "file" in form and hasattr(form["file"], "read"):
                uploaded = form["file"]
                contents = await uploaded.read()
                import base64
                mime = uploaded.content_type or "image/png"
                b64_str = base64.b64encode(contents).decode("utf-8")
                final_logo_url = f"data:{mime};base64,{b64_str}"
            elif "logo_url" in form:
                final_logo_url = str(form["logo_url"]).strip()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid multipart form upload: {str(e)}"
            )
    else:
        # Fallback parsing attempt
        try:
            data = await request.json()
            final_logo_url = (data.get("logo_url") or "").strip()
        except Exception:
            pass

    if not final_logo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid logo URL, base64 data, or image file provided."
        )

    updated = update_company_logo(clean_tenant, final_logo_url)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company workspace '{tenant_id}' not found."
        )

    return CompanyLogoUpdateResponse(
        status="success",
        message="Company logo updated successfully",
        tenant_id=updated["tenant_id"],
        logo_url=updated.get("logo_url", ""),
    )


# ============================================================================
# Document Management & RBAC Endpoints
# ============================================================================

@router.get(
    "/documents",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List ingested documents for a tenant",
    description="Returns deduplicated ingested documents with role access permissions and chunk counts."
)
async def api_list_documents(
    tenant_id: str = Query(..., min_length=1, description="Tenant organization ID")
):
    clean_tenant_id = tenant_id.strip()
    try:
        docs = get_documents_by_tenant(clean_tenant_id)
        return DocumentListResponse(
            status="success",
            tenant_id=clean_tenant_id,
            total=len(docs),
            documents=[DocumentItem(**d) for d in docs],
        )
    except Exception as e:
        logger.error(f"Error fetching documents for tenant '{clean_tenant_id}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch documents: {str(e)}"
        )


@router.patch(
    "/documents/roles",
    response_model=DocumentRolesUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update document RBAC permissions",
    description="Updates the allowed_roles payload field in Qdrant for all chunks of a document and logs the audit event."
)
async def api_update_document_roles(body: DocumentRolesUpdateRequest):
    clean_tenant_id = body.tenant_id.strip()
    clean_doc_name = body.doc_name.strip()
    clean_roles = [r.strip().lower() for r in body.allowed_roles if r.strip()]

    if not clean_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one role must be specified."
        )

    try:
        update_document_roles(clean_tenant_id, clean_doc_name, clean_roles)

        # Audit log the permission update
        audit_logger.log_event(
            user_id="admin_rbac",
            tenant_id=clean_tenant_id.lower(),
            user_roles=["admin"],
            query=f"Updated document permissions for '{clean_doc_name}' to [{', '.join(clean_roles)}]",
            retrieved_chunks_count=0,
            retrieved_documents=[clean_doc_name],
            access_status="PERMISSION_MODIFIED",
        )

        return DocumentRolesUpdateResponse(
            status="success",
            message=f"Permissions for '{clean_doc_name}' updated successfully.",
            tenant_id=clean_tenant_id,
            doc_name=clean_doc_name,
            allowed_roles=clean_roles,
        )
    except Exception as e:
        logger.error(f"Error updating roles for document '{clean_doc_name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update document roles: {str(e)}"
        )


@router.delete(
    "/documents",
    response_model=DocumentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an ingested document",
    description="Deletes all chunks belonging to the document from Qdrant and records an audit log."
)
async def api_delete_document(
    body: Optional[DocumentDeleteRequest] = Body(default=None),
    tenant_id: Optional[str] = Query(default=None),
    doc_name: Optional[str] = Query(default=None)
):
    target_tenant = (body.tenant_id if body and body.tenant_id else tenant_id or "").strip()
    target_doc = (body.doc_name if body and body.doc_name else doc_name or "").strip()

    if not target_tenant or not target_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'tenant_id' and 'doc_name' are required to delete a document."
        )

    try:
        delete_document(target_tenant, target_doc)

        # Audit log the deletion
        audit_logger.log_event(
            user_id="admin_rbac",
            tenant_id=target_tenant.lower(),
            user_roles=["admin"],
            query=f"Purged document '{target_doc}' and all its vector chunks from vector store",
            retrieved_chunks_count=0,
            retrieved_documents=[target_doc],
            access_status="DOCUMENT_DELETED",
        )

        return DocumentDeleteResponse(
            status="success",
            message=f"Document '{target_doc}' and all associated chunks deleted successfully.",
            tenant_id=target_tenant,
            doc_name=target_doc,
        )
    except Exception as e:
        logger.error(f"Error deleting document '{target_doc}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )

