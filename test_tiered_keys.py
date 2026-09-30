"""
Verification script for Role-Specific Access Keys (Tiered Passkeys)
Tests:
1. POST /api/companies/register with 3 distinct passkeys (admin, hr, employee).
2. Validation rejection on identical or missing passkeys.
3. POST /api/companies/verify with admin key -> role == 'admin'.
4. POST /api/companies/verify with hr key -> role == 'hr'.
5. POST /api/companies/verify with employee key -> role == 'employee'.
6. POST /api/companies/verify with invalid key -> 401 Unauthorized.
7. Verification with existing 'lonetex' workspace keys.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_tiered_passkeys():
    print("\n--- Test 1: Reject registration with duplicate keys ---")
    bad_resp = client.post("/api/companies/register", json={
        "name": "Duplicate Passkey Corp",
        "admin_key": "same_key_123",
        "hr_key": "same_key_123",
        "employee_key": "different_key_456"
    })
    assert bad_resp.status_code == 400, f"Expected 400 for duplicate keys, got {bad_resp.status_code}"
    print(f"Correctly rejected duplicate passkeys: {bad_resp.json()['detail']}")

    print("\n--- Test 2: Register new company with 3 distinct keys ---")
    company_name = "Apex Financial Technologies"
    reg_resp = client.post("/api/companies/register", json={
        "name": company_name,
        "admin_key": "apex-admin-sec99",
        "hr_key": "apex-hr-sec88",
        "employee_key": "apex-emp-sec77"
    })
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    tenant_id = reg_data["data"]["tenant_id"]
    print(f"Successfully registered: {reg_data['data']['name']} (tenant: '{tenant_id}')")

    print("\n--- Test 3: Verify Admin Passkey -> role == 'admin' ---")
    admin_verify = client.post("/api/companies/verify", json={
        "tenant_id": tenant_id,
        "access_code": "apex-admin-sec99"
    })
    assert admin_verify.status_code == 200, f"Admin verify failed: {admin_verify.text}"
    data_a = admin_verify.json()
    assert data_a["success"] is True
    assert data_a["role"] == "admin"
    print(f"Admin passkey verified! Role: '{data_a['role']}', Tenant: '{data_a['tenant_id']}'")

    print("\n--- Test 4: Verify HR Passkey -> role == 'hr' ---")
    hr_verify = client.post("/api/companies/verify", json={
        "tenant_id": tenant_id,
        "access_code": "apex-hr-sec88"
    })
    assert hr_verify.status_code == 200, f"HR verify failed: {hr_verify.text}"
    data_h = hr_verify.json()
    assert data_h["success"] is True
    assert data_h["role"] == "hr"
    print(f"HR passkey verified! Role: '{data_h['role']}', Tenant: '{data_h['tenant_id']}'")

    print("\n--- Test 5: Verify Employee Passkey -> role == 'employee' ---")
    emp_verify = client.post("/api/companies/verify", json={
        "tenant_id": tenant_id,
        "access_code": "apex-emp-sec77"
    })
    assert emp_verify.status_code == 200, f"Employee verify failed: {emp_verify.text}"
    data_e = emp_verify.json()
    assert data_e["success"] is True
    assert data_e["role"] == "employee"
    print(f"Employee passkey verified! Role: '{data_e['role']}', Tenant: '{data_e['tenant_id']}'")

    print("\n--- Test 6: Verify Invalid Passkey -> 401 Unauthorized ---")
    bad_verify = client.post("/api/companies/verify", json={
        "tenant_id": tenant_id,
        "access_code": "wrong_password_xyz"
    })
    assert bad_verify.status_code == 401, f"Expected 401, got {bad_verify.status_code}"
    print(f"Correctly returned 401 for invalid passkey: {bad_verify.json()['detail']}")

    print("\n--- Test 7: Verify Lonetex tiered keys ---")
    lonetex_admin = client.post("/api/companies/verify", json={
        "tenant_id": "lonetex",
        "access_code": "8899-admin"
    })
    assert lonetex_admin.status_code == 200
    assert lonetex_admin.json()["role"] == "admin"
    print("Lonetex admin key verified successfully!")

    lonetex_hr = client.post("/api/companies/verify", json={
        "tenant_id": "lonetex",
        "access_code": "8899-hr"
    })
    assert lonetex_hr.status_code == 200
    assert lonetex_hr.json()["role"] == "hr"
    print("Lonetex HR key verified successfully!")

    lonetex_emp = client.post("/api/companies/verify", json={
        "tenant_id": "lonetex",
        "access_code": "8899-emp"
    })
    assert lonetex_emp.status_code == 200
    assert lonetex_emp.json()["role"] == "employee"
    print("Lonetex employee key verified successfully!")

    print("\n========================================================")
    print("ALL TIERED PASSKEY TESTS PASSED!")
    print("========================================================\n")

if __name__ == "__main__":
    test_tiered_passkeys()
