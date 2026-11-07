def test_create_and_list_project(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    create_payload = {
        "name": "Sample React App",
        "repo_url": "https://github.com/sample/react-app",
        "default_branch": "main",
        "framework": "React",
        "language": "TypeScript"
    }
    res = client.post("/api/v1/projects/", json=create_payload, headers=headers)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Sample React App"
    proj_id = created["id"]

    # List projects
    list_res = client.get("/api/v1/projects/", headers=headers)
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["id"] == proj_id for p in projects)

def test_tenant_isolation_cross_user_access_blocked(client, test_user_token, other_user_token):
    # User 1 creates project
    headers_u1 = {"Authorization": f"Bearer {test_user_token}"}
    create_res = client.post(
        "/api/v1/projects/",
        json={"name": "User1 Private Project"},
        headers=headers_u1
    )
    assert create_res.status_code == 201
    proj_id = create_res.json()["id"]

    # User 2 tries to access User 1's project -> MUST be forbidden (403)
    headers_u2 = {"Authorization": f"Bearer {other_user_token}"}
    access_res = client.get(f"/api/v1/projects/{proj_id}", headers=headers_u2)
    assert access_res.status_code == 403
    assert "Access denied" in access_res.json()["error"]["message"]

    # User 2 tries to delete User 1's project -> MUST be forbidden (403)
    delete_res = client.delete(f"/api/v1/projects/{proj_id}", headers=headers_u2)
    assert delete_res.status_code == 403

def test_unauthenticated_project_access_rejected(client):
    res = client.get("/api/v1/projects/")
    assert res.status_code == 401
