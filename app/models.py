from typing import List, Optional
from pydantic import BaseModel, Field


# ==========================================
# Ingestion Models (Step 1)
# ==========================================

class ChunkPayload(BaseModel):
    """Schema for chunk metadata payload stored in Qdrant."""
    tenant_id: str = Field(..., description="Tenant identifier in lowercase")
    allowed_roles: List[str] = Field(..., description="List of authorized roles in lowercase")
    doc_name: str = Field(..., description="Original filename of the ingested document")
    content: str = Field(..., description="Text content of the chunk")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")


class UploadResponseData(BaseModel):
    doc_name: str
    tenant_id: str
    allowed_roles: List[str]
    total_chunks: int


class UploadResponse(BaseModel):
    """Standardized response schema for document ingestion."""
    status: str = "success"
    message: str = "Document successfully parsed, chunked, embedded, and stored in vector database."
    data: UploadResponseData


# ==========================================
# Retrieval & Query Models (Step 2)
# ==========================================

class QueryRequest(BaseModel):
    """Request schema for permission-aware vector search and generation."""
    query: str = Field(..., min_length=1, description="The user query text")
    user_id: str = Field(..., min_length=1, description="Unique user identifier")
    tenant_id: str = Field(..., min_length=1, description="Tenant organization ID")
    user_roles: List[str] = Field(..., min_items=1, description="List of roles assigned to the user")


class QueryResponse(BaseModel):
    """Response schema for the query endpoint."""
    answer: str = Field(..., description="Generated answer based on permission-filtered context")
    retrieved_documents: List[str] = Field(..., description="Deduplicated list of source documents accessed")
    audit_log_id: str = Field(..., description="UUID reference to the corresponding audit record")


# ==========================================
# Audit Logging Models (Step 2)
# ==========================================

class AuditRecord(BaseModel):
    """Schema for a single audit log record."""
    id: str = Field(..., description="UUID identifier of the audit log")
    timestamp: str = Field(..., description="UTC ISO timestamp of the query event")
    user_id: str = Field(..., description="Requesting user ID")
    tenant_id: str = Field(..., description="Tenant ID of the requester")
    user_roles: List[str] = Field(..., description="Roles active during the query")
    query: str = Field(..., description="User query text")
    retrieved_chunks_count: int = Field(..., description="Number of chunks retrieved passing security filters")
    retrieved_documents: List[str] = Field(..., description="Names of documents accessed")
    access_status: str = Field(..., description="'GRANTED' if chunks found, 'DENIED / NO ACCESS' if empty")


class AuditLogResponse(BaseModel):
    """Response schema for the GET /api/audit-logs endpoint."""
    total: int
    logs: List[AuditRecord]


# ==========================================
# Company & Access Code Security Models
# ==========================================

class RoleKeys(BaseModel):
    admin: str = Field(..., min_length=1, description="Passkey for Admin role")
    hr: str = Field(..., min_length=1, description="Passkey for HR role")
    employee: str = Field(..., min_length=1, description="Passkey for Employee role")


class CompanyRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Company name")
    admin_key: Optional[str] = Field(None, description="Admin passkey")
    hr_key: Optional[str] = Field(None, description="HR passkey")
    employee_key: Optional[str] = Field(None, description="Employee passkey")
    keys: Optional[RoleKeys] = Field(None, description="Tiered role keys")
    access_code: Optional[str] = Field(None, description="Legacy fallback access code")
    logo_url: Optional[str] = Field(None, description="Optional logo URL or base64 image data")


class CompanyVerifyRequest(BaseModel):
    tenant_id: str = Field(..., min_length=1, description="Company tenant ID or Name")
    access_code: str = Field(..., min_length=1, description="Role passkey")


class CompanyPublicInfo(BaseModel):
    tenant_id: str
    name: str
    logo_url: Optional[str] = None
    created_at: Optional[str] = None


class CompanyRegisterResponse(BaseModel):
    status: str = "success"
    message: str = "Company registered successfully"
    data: CompanyPublicInfo
    role: str = "admin"


class CompanyVerifyResponse(BaseModel):
    success: bool = True
    status: str = "success"
    message: str = "Access code verified successfully"
    tenant_id: str
    name: str
    role: str
    logo_url: Optional[str] = None


class CompanyListResponse(BaseModel):
    total: int
    companies: List[CompanyPublicInfo]


class CompanyLogoUpdateRequest(BaseModel):
    logo_url: str = Field(..., min_length=1, description="Company logo URL or base64 image data")


class CompanyLogoUpdateResponse(BaseModel):
    status: str = "success"
    message: str = "Company logo updated successfully"
    tenant_id: str
    logo_url: str


# ==========================================
# Document Management & RBAC Models
# ==========================================

class DocumentItem(BaseModel):
    doc_name: str = Field(..., description="Document filename")
    tenant_id: str = Field(..., description="Tenant workspace ID")
    allowed_roles: List[str] = Field(..., description="Roles permitted to access this document")
    chunk_count: int = Field(..., description="Total vector chunks in collection")
    uploaded_at: Optional[str] = Field("", description="Timestamp when uploaded")


class DocumentListResponse(BaseModel):
    status: str = "success"
    tenant_id: str
    total: int
    documents: List[DocumentItem]


class DocumentRolesUpdateRequest(BaseModel):
    tenant_id: str = Field(..., min_length=1, description="Tenant organization ID")
    doc_name: str = Field(..., min_length=1, description="Document filename")
    allowed_roles: List[str] = Field(..., min_items=1, description="New list of allowed roles")


class DocumentRolesUpdateResponse(BaseModel):
    status: str = "success"
    message: str
    tenant_id: str
    doc_name: str
    allowed_roles: List[str]


class DocumentDeleteRequest(BaseModel):
    tenant_id: str = Field(..., min_length=1, description="Tenant organization ID")
    doc_name: str = Field(..., min_length=1, description="Document filename")


class DocumentDeleteResponse(BaseModel):
    status: str = "success"
    message: str
    tenant_id: str
    doc_name: str

