const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Check backend and Qdrant connectivity
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
}

/**
 * Upload document with tenant_id and allowed_roles
 * @param {File} file
 * @param {string} tenantId
 * @param {string[]} allowedRoles
 */
export async function uploadDocument(file, tenantId, allowedRoles) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('tenant_id', tenantId);
  formData.append('allowed_roles', JSON.stringify(allowedRoles));

  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Upload failed (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Query RAG system with pre-LLM security parameters
 * @param {{ query: string, user_id: string, tenant_id: string, user_roles: string[] }} params
 */
export async function queryRAG({ query, user_id, tenant_id, user_roles }) {
  const res = await fetch(`${API_BASE_URL}/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      user_id,
      tenant_id,
      user_roles,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Query failed (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Fetch audit logs with optional tenant filter and limit
 * @param {{ tenant_id?: string, limit?: number }} params
 */
export async function fetchAuditLogs({ tenant_id, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (tenant_id && tenant_id !== 'all') {
    params.append('tenant_id', tenant_id);
  }
  params.append('limit', limit.toString());

  const res = await fetch(`${API_BASE_URL}/api/audit-logs?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Failed to fetch audit logs (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Fetch registered companies list
 */
export async function fetchCompanies() {
  const res = await fetch(`${API_BASE_URL}/api/companies/list`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Failed to load companies (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Register a new company with role-specific tiered passkeys and optional logo
 * @param {{ name: string, admin_key: string, hr_key: string, employee_key: string, keys?: object, logo_url?: string }} param0 
 */
export async function registerCompany({ name, admin_key, hr_key, employee_key, keys, logo_url }) {
  const payload = {
    name,
    admin_key: admin_key || (keys && keys.admin),
    hr_key: hr_key || (keys && keys.hr),
    employee_key: employee_key || (keys && keys.employee),
    keys: keys || (admin_key && hr_key && employee_key ? { admin: admin_key, hr: hr_key, employee: employee_key } : undefined),
    logo_url: logo_url || undefined,
  };

  const res = await fetch(`${API_BASE_URL}/api/companies/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Registration failed (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Verify secret access code / role passkey for a company workspace
 * @param {{ tenant_id: string, access_code: string }} param0 
 */
export async function verifyCompanyAccess({ tenant_id, access_code }) {
  const res = await fetch(`${API_BASE_URL}/api/companies/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenant_id, access_code }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Verification failed (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Upload or update company workspace logo
 * @param {{ tenant_id: string, logo_url?: string, file?: File }} param0 
 */
export async function updateCompanyLogo({ tenant_id, logo_url, file }) {
  let res;
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    res = await fetch(`${API_BASE_URL}/api/companies/${encodeURIComponent(tenant_id)}/logo`, {
      method: 'POST',
      body: formData,
    });
  } else {
    res = await fetch(`${API_BASE_URL}/api/companies/${encodeURIComponent(tenant_id)}/logo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logo_url }),
    });
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Failed to update company logo (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Fetch all unique ingested documents for a tenant workspace
 * @param {string} tenantId 
 */
export async function fetchDocuments(tenantId) {
  const res = await fetch(`${API_BASE_URL}/api/documents?tenant_id=${encodeURIComponent(tenantId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Failed to fetch documents (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Update allowed RBAC roles for a document's chunks in Qdrant
 * @param {{ tenant_id: string, doc_name: string, allowed_roles: string[] }} param0 
 */
export async function updateDocumentRoles({ tenant_id, doc_name, allowed_roles }) {
  const res = await fetch(`${API_BASE_URL}/api/documents/roles`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenant_id, doc_name, allowed_roles }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Failed to update document roles (HTTP ${res.status})`);
  }
  return data;
}

/**
 * Delete an ingested document and all its chunks from Qdrant
 * @param {{ tenant_id: string, doc_name: string }} param0 
 */
export async function deleteDocument({ tenant_id, doc_name }) {
  const res = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenant_id, doc_name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `Failed to delete document (HTTP ${res.status})`);
  }
  return data;
}

