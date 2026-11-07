import pytest
import os
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.finding import Finding
from app.models.repair import RepairSession
from app.services.repair.workspace_manager import WorkspaceManager, WorkspaceSecurityError

client = TestClient(app)

@pytest.fixture
def auth_headers(client_fixture=client):
    email = f"repair_eng_{os.urandom(4).hex()}@proofforge.ai"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Repair Studio Engineer"
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_project_and_finding(auth_headers):
    # Create project
    r_proj = client.post("/api/v1/projects/", json={
        "name": "Authorization Benchmark Project",
        "default_branch": "main"
    }, headers=auth_headers)
    assert r_proj.status_code == 201
    proj_id = r_proj.json()["id"]

    # Trigger scan to populate finding or create finding
    db = next(get_db())
    finding = Finding(
        project_id=proj_id,
        title="Missing Object-Level Authorization in Invoice Handler",
        description="Endpoint allows unauthorized horizontal access to invoices.",
        severity="high",
        category="security",
        file_path="app.py",
        line_number=14,
        cwe_id="CWE-639",
        status="open",
        scanner_name="builtin_ast",
        confidence="high",
        verification_status="reproduction_verified"
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)

    return proj_id, finding.id

def test_create_and_read_repair_session(auth_headers, test_project_and_finding):
    proj_id, finding_id = test_project_and_finding

    # 1. Create or resume repair session
    res = client.post(
        f"/api/v1/projects/{proj_id}/findings/{finding_id}/repair-session",
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["project_id"] == proj_id
    assert data["finding_id"] == finding_id
    assert data["fixture_id"] == "fixture_idor"
    assert data["status"] == "active"
    assert "INVOICES = {" in data["editable_code"]
    assert "get_invoice" in data["editable_code"]
    session_id = data["id"]

    # 2. Retrieve session view
    r_get = client.get(f"/api/v1/repair-sessions/{session_id}", headers=auth_headers)
    assert r_get.status_code == 200
    assert r_get.json()["id"] == session_id

def test_workspace_isolation_and_draft_saving(auth_headers, test_project_and_finding):
    proj_id, finding_id = test_project_and_finding

    res = client.post(
        f"/api/v1/projects/{proj_id}/findings/{finding_id}/repair-session",
        headers=auth_headers
    )
    session_id = res.json()["id"]
    original_code = res.json()["original_code"]

    # Modify code in practice workspace
    modified_code = original_code.replace(
        "return INVOICES[invoice_id]",
        "# Added check\n    if INVOICES[invoice_id]['owner_id'] != x_user_id:\n        raise HTTPException(403)\n    return INVOICES[invoice_id]"
    )

    r_save = client.put(f"/api/v1/repair-sessions/{session_id}/draft", json={
        "file_path": "app.py",
        "code": modified_code
    }, headers=auth_headers)
    assert r_save.status_code == 200
    assert r_save.json()["saved"] is True
    assert "+    if INVOICES[invoice_id]['owner_id'] != x_user_id:" in r_save.json()["diff"]

    # Verify template fixture remains 100% immutable
    orig_from_disk = WorkspaceManager.read_original_code("fixture_idor", "app.py")
    assert "+    if INVOICES[invoice_id]['owner_id'] != x_user_id:" not in orig_from_disk

def test_reset_workspace_to_template(auth_headers, test_project_and_finding):
    proj_id, finding_id = test_project_and_finding

    res = client.post(f"/api/v1/projects/{proj_id}/findings/{finding_id}/repair-session", headers=auth_headers)
    session_id = res.json()["id"]

    # Write broken draft
    client.put(f"/api/v1/repair-sessions/{session_id}/draft", json={
        "file_path": "app.py",
        "code": "# Broken draft"
    }, headers=auth_headers)

    # Reset workspace
    r_reset = client.post(f"/api/v1/repair-sessions/{session_id}/reset", headers=auth_headers)
    assert r_reset.status_code == 200
    assert "INVOICES = {" in r_reset.json()["editable_code"]
    assert r_reset.json()["diff"] == ""

def test_socratic_hints_progression(auth_headers, test_project_and_finding):
    proj_id, finding_id = test_project_and_finding
    res = client.post(f"/api/v1/projects/{proj_id}/findings/{finding_id}/repair-session", headers=auth_headers)
    session_id = res.json()["id"]

    # Request Level 1
    r_h1 = client.post(f"/api/v1/repair-sessions/{session_id}/hints", json={"level": 1}, headers=auth_headers)
    assert r_h1.status_code == 200
    assert "Object-Level Authorization" in r_h1.json()["title"]
    assert 1 in r_h1.json()["hints_unlocked"]

    # Request Level 2
    r_h2 = client.post(f"/api/v1/repair-sessions/{session_id}/hints", json={"level": 2}, headers=auth_headers)
    assert r_h2.status_code == 200
    assert 2 in r_h2.json()["hints_unlocked"]
    assert len(r_h2.json()["hints_unlocked"]) == 2

def test_security_boundaries_path_traversal_and_unauthorized_files(auth_headers, test_project_and_finding):
    proj_id, finding_id = test_project_and_finding
    res = client.post(f"/api/v1/projects/{proj_id}/findings/{finding_id}/repair-session", headers=auth_headers)
    session_id = res.json()["id"]

    # 1. Path traversal attempt
    r_trav = client.put(f"/api/v1/repair-sessions/{session_id}/draft", json={
        "file_path": "../../etc/passwd",
        "code": "malicious"
    }, headers=auth_headers)
    assert r_trav.status_code == 400
    assert "Path traversal" in r_trav.text or "Unauthorized" in r_trav.text

    # 2. Unauthorized file attempt
    r_unauth = client.put(f"/api/v1/repair-sessions/{session_id}/draft", json={
        "file_path": "reproduce_test.py",
        "code": "print('tampered grader')"
    }, headers=auth_headers)
    assert r_unauth.status_code == 400
    assert "unauthorized" in r_unauth.text.lower()

def test_cross_tenant_isolation(auth_headers, test_project_and_finding):
    proj_id, finding_id = test_project_and_finding
    res = client.post(f"/api/v1/projects/{proj_id}/findings/{finding_id}/repair-session", headers=auth_headers)
    session_id = res.json()["id"]

    # Register second user
    r_user2 = client.post("/api/v1/auth/register", json={
        "email": f"attacker_{os.urandom(4).hex()}@proofforge.ai",
        "password": "AttackerPass123!",
        "full_name": "Attacker Tenant"
    })
    token2 = r_user2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # User 2 tries to access User 1's repair session
    r_hack = client.get(f"/api/v1/repair-sessions/{session_id}", headers=headers2)
    assert r_hack.status_code == 404
