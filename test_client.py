"""
Test script to demonstrate and verify Step 1 ingestion endpoint.
Uploads a sample text document with tenant_id and allowed_roles.
"""

import json
import io
import requests

API_URL = "http://127.0.0.1:8000/api/upload"

sample_text = """
========================================
Enterprise Security and Compliance Manual
Tenant: Company A
Confidentiality: Internal / Role-Restricted
========================================

Section 1: Access Control and Role Governance
Access to confidential company assets, employee salary records, and internal system
configurations is strictly governed by role-based access control (RBAC).
Employees holding the 'admin' role possess administrative rights across all internal infrastructure,
while users with the 'hr' role have specific authorization to manage personnel data, performance reviews,
and disciplinary records.

Section 2: Multi-Tenant Data Isolation
Each tenant operating on our cloud platform is allocated isolated data namespaces.
Data chunks stored within vector databases must always carry the verified tenant identifier
and an array of permitted roles. When retrieval queries are executed, vector search filters
must deterministically match the requester's tenant identity and role authorization.

Section 3: Incident Response & Audit Logging
All file uploads, updates, and access requests are logged with UTC timestamps.
Audit trails must preserve document provenance, including the original document title,
the ingesting tenant, and the exact permission parameters specified at ingestion time.
"""

def run_test():
    print(f"Testing document upload to {API_URL}...")

    # Prepare multipart form data
    files = {
        "file": ("security_policy.txt", io.BytesIO(sample_text.encode("utf-8")), "text/plain")
    }
    data = {
        "tenant_id": "company_a",
        "allowed_roles": json.dumps(["admin", "hr"])
    }

    try:
        response = requests.post(API_URL, files=files, data=data)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API server. Make sure FastAPI is running on port 8000.")


if __name__ == "__main__":
    run_test()
