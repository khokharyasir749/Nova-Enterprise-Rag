import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("=" * 70)
print("VERIFYING LIVE GEMINI GENERATION & PERMISSION FLOW")
print("=" * 70)

# 1. Test conversational query: "who are you"
print("\n--- Test 1: General Conversational Question ('who are you') ---")
res1 = requests.post(f"{BASE_URL}/api/query", json={
    "query": "who are you",
    "user_id": "alice_admin",
    "tenant_id": "company_a",
    "user_roles": ["admin"]
})
print(f"Status: {res1.status_code}")
d1 = res1.json()
print(f"Answer: {d1.get('answer')}")
print(f"Retrieved Documents: {d1.get('retrieved_documents')}")
print(f"Audit Log ID: {d1.get('audit_log_id')}")

# 2. Upload document for company_a restricted to role 'admin'
print("\n--- Test 2: Ingest Document for company_a (admin only) ---")
upload_res = requests.post(
    f"{BASE_URL}/api/upload",
    files={"file": ("executive_plan.txt", b"Acquisition Strategy: In Q4 Company A will invest 25 million dollars in autonomous AI research and secure quantum networks.", "text/plain")},
    data={"tenant_id": "company_a", "allowed_roles": json.dumps(["admin"])}
)
print(f"Upload Status: {upload_res.status_code}")
print(f"Upload Data: {upload_res.json()}")

# 3. Query with authorized role 'admin'
print("\n--- Test 3: Authorized Query (admin role -> Gemini Synthesizes from Context) ---")
res2 = requests.post(f"{BASE_URL}/api/query", json={
    "query": "How much will Company A invest in autonomous AI research in Q4?",
    "user_id": "alice_admin",
    "tenant_id": "company_a",
    "user_roles": ["admin"]
})
print(f"Status: {res2.status_code}")
d2 = res2.json()
print(f"Answer:\n{d2.get('answer')}")
print(f"Retrieved Documents: {d2.get('retrieved_documents')}")
print(f"Audit Log ID: {d2.get('audit_log_id')}")

# 4. Query with unauthorized role 'employee'
print("\n--- Test 4: Unauthorized Role Query (employee role -> Pre-LLM Denial) ---")
res3 = requests.post(f"{BASE_URL}/api/query", json={
    "query": "How much will Company A invest in autonomous AI research in Q4?",
    "user_id": "bob_employee",
    "tenant_id": "company_a",
    "user_roles": ["employee"]
})
print(f"Status: {res3.status_code}")
d3 = res3.json()
print(f"Answer:\n{d3.get('answer')}")
print(f"Retrieved Documents: {d3.get('retrieved_documents')}")
print(f"Audit Log ID: {d3.get('audit_log_id')}")

# 5. Cross-tenant query (tenant: company_b)
print("\n--- Test 5: Cross-Tenant Isolation (company_b user -> Pre-LLM Denial) ---")
res4 = requests.post(f"{BASE_URL}/api/query", json={
    "query": "How much will Company A invest in autonomous AI research in Q4?",
    "user_id": "charlie_admin",
    "tenant_id": "company_b",
    "user_roles": ["admin"]
})
print(f"Status: {res4.status_code}")
d4 = res4.json()
print(f"Answer:\n{d4.get('answer')}")
print(f"Retrieved Documents: {d4.get('retrieved_documents')}")
print(f"Audit Log ID: {d4.get('audit_log_id')}")

print("\n" + "=" * 70)
print("ALL VERIFICATION CHECKS COMPLETED!")
print("=" * 70)
