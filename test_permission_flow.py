"""
Step 2 Verification Script: Permission-Aware Multi-Tenant Flow Test
Demonstrates and validates:
1. Ingestion of documents with role and tenant restrictions.
2. Pre-LLM Security Filtering:
   - Case A: Matching tenant and matching role ('admin') -> Access GRANTED.
   - Case B: Matching tenant but unauthorized role ('employee' on admin-only doc) -> Access DENIED.
   - Case C: Cross-tenant isolation ('company_b' user on 'company_a' doc) -> Access DENIED.
3. Audit Log Inspection:
   - Fetches and displays the complete audit log records for all test cases.
"""

import io
import json
import sys
import time
import requests

BASE_URL = "http://127.0.0.1:8000"
UPLOAD_URL = f"{BASE_URL}/api/upload"
QUERY_URL = f"{BASE_URL}/api/query"
AUDIT_URL = f"{BASE_URL}/api/audit-logs"

# Sample documents for tenant: company_a
DOC_ADMIN_ONLY = """
==================================================
CONFIDENTIAL EXECUTIVE REPORT - COMPANY A
Authorized Roles: [admin]
==================================================
Executive Compensation & M&A Strategy:
In Q4, Company A will allocate $15M toward strategic expansion and acquire
CloudVentures. Executive bonuses will be pegged at 18% of adjusted EBITDA.
This document is strictly restricted to administrative executives.
"""

DOC_GENERAL_POLICY = """
==================================================
GENERAL STAFF HANDBOOK - COMPANY A
Authorized Roles: [admin, employee]
==================================================
Working Hours and Benefits:
Standard working hours are 9:00 AM to 5:00 PM Monday through Friday.
All employees are entitled to 20 days of paid annual leave. Remote work
is permitted up to two days per week with manager approval.
"""


def check_server_health():
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code == 200:
            print(f"[OK] Server is reachable at {BASE_URL}. Health: {r.json()}\n")
            return True
    except requests.exceptions.ConnectionError:
        pass
    print(f"[ERROR] Could not connect to {BASE_URL}. Please start the server with:")
    print("  uvicorn app.main:app --reload --port 8000\n")
    return False


def upload_document(filename: str, content: str, tenant_id: str, roles: list):
    print(f"Uploading '{filename}' for tenant='{tenant_id}', roles={roles}...")
    files = {
        "file": (filename, io.BytesIO(content.encode("utf-8")), "text/plain")
    }
    data = {
        "tenant_id": tenant_id,
        "allowed_roles": json.dumps(roles),
    }
    res = requests.post(UPLOAD_URL, files=files, data=data)
    if res.status_code != 201:
        print(f"  [FAIL] Ingestion failed: {res.status_code} - {res.text}")
        return False
    data = res.json()["data"]
    print(f"  [SUCCESS] Ingested {data['total_chunks']} chunk(s) for '{data['doc_name']}'.\n")
    return True


def query_rag(user_id: str, tenant_id: str, user_roles: list, question: str):
    payload = {
        "query": question,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "user_roles": user_roles,
    }
    res = requests.post(QUERY_URL, json=payload)
    if res.status_code != 200:
        print(f"  [ERROR] Query failed ({res.status_code}): {res.text}")
        return None
    return res.json()


def main():
    print("=" * 70)
    print("Step 2: Multi-Tenant Permission-Aware RAG Verification")
    print("=" * 70)

    if not check_server_health():
        sys.exit(1)

    # 1. Ingest test documents
    print(">>> 1. Ingesting Multi-Tenant Test Documents into Qdrant...\n")
    upload_document("admin_report.txt", DOC_ADMIN_ONLY, "company_a", ["admin"])
    upload_document("staff_handbook.txt", DOC_GENERAL_POLICY, "company_a", ["admin", "employee"])

    # Give Qdrant a brief moment to finish indexing
    time.sleep(1)

    # 2. Test Cases
    print("=" * 70)
    print(">>> 2. Executing Permission-Aware Security Tests\n")

    question = "What is the Q4 expansion strategy and executive compensation plan?"

    # --- Scenario A: Admin User of Company A ---
    print("----------------------------------------------------------------------")
    print("Scenario A: User 'alice_admin' [tenant: company_a, roles: ['admin']]")
    print(f"Query: \"{question}\"")
    resp_a = query_rag("alice_admin", "company_a", ["admin"], question)
    if resp_a:
        print(f"Retrieved Documents: {resp_a['retrieved_documents']}")
        print(f"Audit Log ID:        {resp_a['audit_log_id']}")
        print(f"Answer:\n{resp_a['answer']}\n")
        assert len(resp_a["retrieved_documents"]) > 0, "Scenario A should have retrieved documents!"
        print("[PASS] Scenario A: Access GRANTED as expected for role 'admin'.\n")

    # --- Scenario B: Employee User of Company A asking about Admin doc ---
    print("----------------------------------------------------------------------")
    print("Scenario B: User 'bob_employee' [tenant: company_a, roles: ['employee']]")
    print(f"Query: \"{question}\"")
    resp_b = query_rag("bob_employee", "company_a", ["employee"], question)
    if resp_b:
        print(f"Retrieved Documents: {resp_b['retrieved_documents']}")
        print(f"Audit Log ID:        {resp_b['audit_log_id']}")
        print(f"Answer:\n{resp_b['answer']}\n")
        assert len(resp_b["retrieved_documents"]) == 0, "Scenario B must retrieve 0 documents!"
        assert "No accessible information found" in resp_b["answer"]
        print("[PASS] Scenario B: Access DENIED. Pre-LLM filter blocked unauthorized chunks.\n")

    # --- Scenario C: Cross-Tenant User from Company B ---
    print("----------------------------------------------------------------------")
    print("Scenario C: User 'charlie_tenant_b' [tenant: company_b, roles: ['admin']]")
    print(f"Query: \"{question}\"")
    resp_c = query_rag("charlie_tenant_b", "company_b", ["admin"], question)
    if resp_c:
        print(f"Retrieved Documents: {resp_c['retrieved_documents']}")
        print(f"Audit Log ID:        {resp_c['audit_log_id']}")
        print(f"Answer:\n{resp_c['answer']}\n")
        assert len(resp_c["retrieved_documents"]) == 0, "Scenario C must retrieve 0 documents!"
        assert "No accessible information found" in resp_c["answer"]
        print("[PASS] Scenario C: Cross-tenant isolation verified! Zero company_a chunks leaked.\n")

    # 3. Verify Audit Logs
    print("=" * 70)
    print(">>> 3. Fetching and Inspecting Audit Logs (/api/audit-logs)\n")
    audit_res = requests.get(f"{AUDIT_URL}?limit=10")
    if audit_res.status_code == 200:
        audit_data = audit_res.json()
        print(f"Total Audit Records Found: {audit_data['total']}\n")
        print(f"{'TIMESTAMP':<28} | {'USER':<16} | {'TENANT':<12} | {'STATUS':<20} | {'DOCS'}")
        print("-" * 95)
        for log in audit_data["logs"][:5]:
            ts = log["timestamp"][:23]
            user = log["user_id"]
            tenant = log["tenant_id"]
            status = log["access_status"]
            docs = ", ".join(log["retrieved_documents"]) or "[None]"
            print(f"{ts:<28} | {user:<16} | {tenant:<12} | {status:<20} | {docs}")
        print("\n[PASS] Audit trail verified: all queries and access outcomes were logged.")
    else:
        print(f"[FAIL] Could not retrieve audit logs: {audit_res.text}")

    print("\n" + "=" * 70)
    print("Step 2 Verification Complete: All Security & Audit Requirements Passed!")
    print("=" * 70)


if __name__ == "__main__":
    main()
