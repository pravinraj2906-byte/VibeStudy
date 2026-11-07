import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db
from app.models.finding import Finding
from app.models.repair import RepairSession
from app.services.repair.workspace_manager import WorkspaceManager

client = TestClient(app)

@pytest.fixture
def auth_headers():
    email = f"verify_lead_{os.urandom(4).hex()}@proofforge.ai"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "QA Verification Lead"
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_session(auth_headers):
    # Create project & finding
    r_proj = client.post("/api/v1/projects/", json={
        "name": "Verification Project",
        "default_branch": "main"
    }, headers=auth_headers)
    proj_id = r_proj.json()["id"]

    db = next(get_db())
    finding = Finding(
        project_id=proj_id,
        title="IDOR in Invoice Handler",
        description="Missing object level auth",
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

    res = client.post(
        f"/api/v1/projects/{proj_id}/findings/{finding.id}/repair-session",
        headers=auth_headers
    )
    assert res.status_code == 200
    return res.json()["id"]

def test_verification_scenario_b_no_change_is_incomplete(auth_headers, test_session):
    """Submitting the original vulnerable code without changes must yield INCOMPLETE."""
    session_id = test_session
    orig_code = WorkspaceManager.read_original_code("fixture_idor", "app.py")

    res = client.post(f"/api/v1/repair-sessions/{session_id}/verify", json={
        "file_path": "app.py",
        "code": orig_code
    }, headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "INCOMPLETE"
    assert "Defect still reproducible" in data["summary"]

def test_verification_scenario_c_deny_all_is_regression(auth_headers, test_session):
    """Denying all requests (e.g. unconditionally raising 403) must be caught as REGRESSION_DETECTED."""
    session_id = test_session
    orig_code = WorkspaceManager.read_original_code("fixture_idor", "app.py")

    # Cheat attempt: unconditionally block everything
    deny_all_code = orig_code.replace(
        "return INVOICES[invoice_id]",
        "raise HTTPException(status_code=403, detail='Access denied for all')"
    )

    res = client.post(f"/api/v1/repair-sessions/{session_id}/verify", json={
        "file_path": "app.py",
        "code": deny_all_code
    }, headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "REGRESSION_DETECTED"
    assert "Regression detected" in data["summary"]

def test_verification_scenario_d_special_case_is_incomplete(auth_headers, test_session):
    """Hardcoding only invoice 101 must fail generalization checks and yield INCOMPLETE."""
    session_id = test_session
    orig_code = WorkspaceManager.read_original_code("fixture_idor", "app.py")

    # Cheat attempt: hardcode only invoice 101 check
    special_case_code = orig_code.replace(
        "return INVOICES[invoice_id]",
        "if invoice_id == 101 and x_user_id != 'user_alice': raise HTTPException(403, 'Denied')\n    return INVOICES[invoice_id]"
    )

    res = client.post(f"/api/v1/repair-sessions/{session_id}/verify", json={
        "file_path": "app.py",
        "code": special_case_code
    }, headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "INCOMPLETE"

def test_verification_scenario_e_syntax_error(auth_headers, test_session):
    """Submitting invalid Python syntax must immediately return EXECUTION_FAILED without crashing."""
    session_id = test_session
    broken_syntax = "def broken(:\n  return {"

    res = client.post(f"/api/v1/repair-sessions/{session_id}/verify", json={
        "file_path": "app.py",
        "code": broken_syntax
    }, headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "EXECUTION_FAILED"
    assert "syntax error" in data["summary"].lower()

def test_verification_scenario_f_unauthorized_file_security_block(auth_headers, test_session):
    """Attempting to patch unapproved files must result in 400 Bad Request."""
    session_id = test_session
    res = client.post(f"/api/v1/repair-sessions/{session_id}/verify", json={
        "file_path": "verify_test.py",
        "code": "print('bypass tests')"
    }, headers=auth_headers)

    assert res.status_code == 400
    assert "unauthorized" in res.text.lower()

def test_verification_scenario_a_correct_fix_is_verified(auth_headers, test_session):
    """A correct, generalized object-level authorization check must pass all tests and yield VERIFIED_FIXED."""
    session_id = test_session
    orig_code = WorkspaceManager.read_original_code("fixture_idor", "app.py")

    # Correct generalized fix: check invoice['owner_id'] against x_user_id
    correct_code = orig_code.replace(
        "return INVOICES[invoice_id]",
        """invoice = INVOICES[invoice_id]
    if invoice.get("owner_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to access this invoice")
    return invoice"""
    )

    res = client.post(f"/api/v1/repair-sessions/{session_id}/verify", json={
        "file_path": "app.py",
        "code": correct_code
    }, headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "VERIFIED_FIXED"
    assert "All authorization and regression tests passed" in data["summary"]
    assert all(t["passed"] for t in data["test_results"])

    # Verify attempt history records are populated
    r_hist = client.get(f"/api/v1/repair-sessions/{session_id}/patches", headers=auth_headers)
    assert r_hist.status_code == 200
    assert len(r_hist.json()) >= 1
    assert r_hist.json()[0]["verification_status"] == "VERIFIED_FIXED"

def test_verification_fail_closed_when_docker_unavailable(auth_headers, test_session):
    """When Docker daemon is unavailable, untrusted patch execution must fail closed."""
    session_id = test_session
    orig_code = WorkspaceManager.read_original_code("fixture_idor", "app.py")

    with patch("app.services.repair.verifier.is_docker_available", return_value=False):
        res = client.post(f"/api/v1/repair-sessions/{session_id}/verify", json={
            "file_path": "app.py",
            "code": orig_code
        }, headers=auth_headers)

        assert res.status_code == 200
        data = res.json()
        assert data["verification_status"] == "SECURITY_BLOCKED"
        assert "Docker container isolation is required" in data["summary"]
        assert data["runner_type"] == "fail_closed_policy"
