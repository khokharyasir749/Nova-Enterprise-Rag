"""
Automated Verification Script for Document Management Endpoints:
1. Ingest test documents with roles.
2. GET /api/documents?tenant_id={tenant_id} -> verify doc list, allowed_roles, and chunk_count.
3. PATCH /api/documents/roles -> update allowed_roles to include 'employee' and verify.
4. Verify RAG retrieval reflects the newly granted role immediately.
5. DELETE /api/documents -> delete document points from Qdrant.
6. Verify document is gone from GET /api/documents and retrieval returns 0.
"""

import json
import io
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_qdrant_client, ensure_collection_exists

client = TestClient(app)

def test_full_document_lifecycle():
    print("\n--- Step 1: Ensure Qdrant collection is ready ---")
    q_client = get_qdrant_client()
    ensure_collection_exists(q_client)

    tenant_id = "test_corp_alpha"
    doc_name = "strategic_roadmap_2026.txt"
    sample_content = (
        "CONFIDENTIAL STRATEGIC ROADMAP 2026\n"
        "Projected expansion budget: $30M.\n"
        "Target acquisitions: CloudNet, DataCore.\n"
        "Executive governance: Strictly Admin.\n"
    )

    print("\n--- Step 2: Upload document with role ['admin'] ---")
    files = {
        "file": (doc_name, io.BytesIO(sample_content.encode("utf-8")), "text/plain")
    }
    data = {
        "tenant_id": tenant_id,
        "allowed_roles": json.dumps(["admin"])
    }
    upload_resp = client.post("/api/upload", files=files, data=data)
    assert upload_resp.status_code == 201, f"Upload failed: {upload_resp.text}"
    upload_data = upload_resp.json()["data"]
    print(f"Uploaded successfully: {upload_data['doc_name']} ({upload_data['total_chunks']} chunks)")
    assert upload_data["total_chunks"] >= 1

    print("\n--- Step 3: GET /api/documents?tenant_id={tenant_id} ---")
    get_resp = client.get(f"/api/documents?tenant_id={tenant_id}")
    assert get_resp.status_code == 200, f"GET /api/documents failed: {get_resp.text}"
    get_data = get_resp.json()
    print(f"GET Response: {json.dumps(get_data, indent=2)}")
    assert get_data["status"] == "success"
    assert get_data["total"] >= 1
    found_doc = next((d for d in get_data["documents"] if d["doc_name"] == doc_name), None)
    assert found_doc is not None, f"Document '{doc_name}' not found in GET response"
    assert "admin" in [r.lower() for r in found_doc["allowed_roles"]]
    assert found_doc["chunk_count"] == upload_data["total_chunks"]
    print(f"Verified GET /api/documents: doc_name='{found_doc['doc_name']}', chunks={found_doc['chunk_count']}, roles={found_doc['allowed_roles']}")

    print("\n--- Step 4: Verify pre-update retrieval (Employee should be DENIED) ---")
    query_resp = client.post("/api/query", json={
        "query": "What is the expansion budget?",
        "user_id": "test_emp",
        "tenant_id": tenant_id,
        "user_roles": ["employee"]
    })
    assert query_resp.status_code == 200
    assert len(query_resp.json()["retrieved_documents"]) == 0
    print("Employee query before role update: Correctly DENIED (0 retrieved documents).")

    print("\n--- Step 5: PATCH /api/documents/roles (grant ['admin', 'employee']) ---")
    patch_resp = client.patch("/api/documents/roles", json={
        "tenant_id": tenant_id,
        "doc_name": doc_name,
        "allowed_roles": ["admin", "employee"]
    })
    assert patch_resp.status_code == 200, f"PATCH failed: {patch_resp.text}"
    patch_data = patch_resp.json()
    print(f"PATCH Response: {json.dumps(patch_data, indent=2)}")
    assert patch_data["status"] == "success"
    assert "employee" in [r.lower() for r in patch_data["allowed_roles"]]

    print("\n--- Step 6: Verify GET /api/documents shows updated roles ---")
    get_resp_after = client.get(f"/api/documents?tenant_id={tenant_id}")
    assert get_resp_after.status_code == 200
    doc_after = next((d for d in get_resp_after.json()["documents"] if d["doc_name"] == doc_name), None)
    assert doc_after is not None
    assert set(doc_after["allowed_roles"]) == {"admin", "employee"}
    print(f"GET /api/documents after PATCH: updated roles = {doc_after['allowed_roles']}")

    print("\n--- Step 7: Verify post-update retrieval (Employee should now be GRANTED) ---")
    query_resp_after = client.post("/api/query", json={
        "query": "What is the expansion budget?",
        "user_id": "test_emp",
        "tenant_id": tenant_id,
        "user_roles": ["employee"]
    })
    assert query_resp_after.status_code == 200
    assert doc_name in query_resp_after.json()["retrieved_documents"]
    print(f"Employee query after role update: Correctly GRANTED! Retrieved docs: {query_resp_after.json()['retrieved_documents']}")

    print("\n--- Step 8: DELETE /api/documents ---")
    del_resp = client.request("DELETE", "/api/documents", json={
        "tenant_id": tenant_id,
        "doc_name": doc_name
    })
    assert del_resp.status_code == 200, f"DELETE failed: {del_resp.text}"
    del_data = del_resp.json()
    print(f"DELETE Response: {json.dumps(del_data, indent=2)}")
    assert del_data["status"] == "success"

    print("\n--- Step 9: Verify document is gone from GET /api/documents ---")
    get_resp_deleted = client.get(f"/api/documents?tenant_id={tenant_id}")
    assert get_resp_deleted.status_code == 200
    doc_deleted = next((d for d in get_resp_deleted.json()["documents"] if d["doc_name"] == doc_name), None)
    assert doc_deleted is None, "Document still present after DELETE!"
    print("GET /api/documents after DELETE: Document successfully eliminated.")

    print("\n--- Step 10: Verify query returns 0 documents for deleted doc ---")
    query_resp_final = client.post("/api/query", json={
        "query": "What is the expansion budget?",
        "user_id": "test_admin",
        "tenant_id": tenant_id,
        "user_roles": ["admin"]
    })
    assert query_resp_final.status_code == 200
    assert doc_name not in query_resp_final.json()["retrieved_documents"]
    print("Query for deleted document returns 0 documents. Cleanup verified.")

    print("\n========================================================")
    print("ALL TESTS PASSED: Document Ingestion, RBAC Management, and Deletion fully verified!")
    print("========================================================\n")

if __name__ == "__main__":
    test_full_document_lifecycle()
