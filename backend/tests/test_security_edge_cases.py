import pytest
from fastapi.testclient import TestClient

def test_malformed_github_urls(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    malformed_cases = [
        "https://notgithub.com/owner/repo",
        "http://evil.com/fake",
        "https://github.com//invalid",
        "ftp://github.com/owner/repo",
        "https://github.com/onlyonepart",
        "javascript:alert(1)"
    ]

    for bad_url in malformed_cases:
        res = client.post(
            "/api/v1/projects/import",
            json={"repo_url": bad_url},
            headers=headers
        )
        assert res.status_code == 400, f"Expected 400 for '{bad_url}', got {res.status_code}: {res.text}"
        data = res.json()
        assert "Invalid GitHub repository URL" in data["error"]["message"]

def test_nonexistent_repo_import_fails_gracefully(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    nonexistent = "https://github.com/Praveensagar07/completely-nonexistent-repo-9999999"
    res = client.post(
        "/api/v1/projects/import",
        json={"repo_url": nonexistent},
        headers=headers
    )
    assert res.status_code in [404, 500, 502], f"Expected 404, 500, or 502, got {res.status_code}"
    data = res.json()
    assert "error" in data

def test_cross_tenant_isolation_all_project_endpoints(
    client: TestClient,
    test_user_token: str,
    other_user_token: str
):
    # 1. User 1 creates a project
    headers_u1 = {"Authorization": f"Bearer {test_user_token}"}
    create_res = client.post(
        "/api/v1/projects/",
        json={"name": "Confidential Project User 1"},
        headers=headers_u1
    )
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    headers_u2 = {"Authorization": f"Bearer {other_user_token}"}

    # 2. User 2 tries to GET details
    res_get = client.get(f"/api/v1/projects/{proj_id}", headers=headers_u2)
    assert res_get.status_code == 403, f"Expected 403, got {res_get.status_code}"

    # 3. User 2 tries to GET files
    res_files = client.get(f"/api/v1/projects/{proj_id}/files", headers=headers_u2)
    assert res_files.status_code == 403, f"Expected 403, got {res_files.status_code}"

    # 4. User 2 tries to GET file content
    res_content = client.get(f"/api/v1/projects/{proj_id}/file-content?path=README.md", headers=headers_u2)
    assert res_content.status_code == 403, f"Expected 403, got {res_content.status_code}"

    # 5. User 2 tries to POST explain
    res_explain = client.post(
        f"/api/v1/projects/{proj_id}/explain",
        json={"file_path": "README.md"},
        headers=headers_u2
    )
    assert res_explain.status_code == 403, f"Expected 403, got {res_explain.status_code}"

    # 6. User 2 tries to DELETE project
    res_delete = client.delete(f"/api/v1/projects/{proj_id}", headers=headers_u2)
    assert res_delete.status_code == 403, f"Expected 403, got {res_delete.status_code}"

    # 7. Unauthenticated requests to all endpoints
    assert client.get(f"/api/v1/projects/{proj_id}").status_code == 401
    assert client.get(f"/api/v1/projects/{proj_id}/files").status_code == 401
    assert client.get(f"/api/v1/projects/{proj_id}/file-content?path=README.md").status_code == 401
    assert client.delete(f"/api/v1/projects/{proj_id}").status_code == 401
