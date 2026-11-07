import pytest
import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    email = f"transfer_eng_{os.urandom(4).hex()}@proofforge.ai"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "SecurePassword123!",
        "full_name": "Skill Transfer Engineer"
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_list_and_get_transfer_challenges(auth_headers):
    # 1. List challenges
    r_list = client.get("/api/v1/challenges", headers=auth_headers)
    assert r_list.status_code == 200
    challenges = r_list.json()
    assert len(challenges) >= 1
    flagship = next(c for c in challenges if c["challenge_id"] == "transfer-task-auth-v1")
    assert flagship["concept"] == "Broken Object-Level Authorization (IDOR)"
    assert "Task" in flagship["title"]

    # 2. Get detail
    r_detail = client.get("/api/v1/challenges/transfer-task-auth-v1", headers=auth_headers)
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert "TASKS = {" in detail["starter_code"]
    assert detail["editable_file"] == "task_api.py"
    assert len(detail["rules"]) >= 3

def test_start_attempt_and_draft_saving(auth_headers):
    # 1. Start attempt
    r_start = client.post("/api/v1/challenges/transfer-task-auth-v1/start", headers=auth_headers)
    assert r_start.status_code == 200
    attempt = r_start.json()
    assert attempt["status"] == "in_progress"
    assert attempt["is_unassisted"] is True
    assert attempt["score"] == 0
    attempt_id = attempt["id"]

    # 2. Save draft
    code = attempt["current_code"] + "\n# Practice draft note"
    r_draft = client.put(f"/api/v1/challenges/attempts/{attempt_id}/draft", json={
        "code": code
    }, headers=auth_headers)
    assert r_draft.status_code == 200
    assert r_draft.json()["saved"] is True
    assert "+# Practice draft note" in r_draft.json()["diff"]

def test_request_hint_marks_attempt_assisted(auth_headers):
    r_start = client.post("/api/v1/challenges/transfer-task-auth-v1/start", headers=auth_headers)
    attempt_id = r_start.json()["id"]

    # Request hint
    r_hint = client.post(f"/api/v1/challenges/attempts/{attempt_id}/hint", headers=auth_headers)
    assert r_hint.status_code == 200
    assert r_hint.json()["is_unassisted"] is False
    assert "org_id" in r_hint.json()["hint"]

def test_submit_vulnerable_code_fails_hidden_tests(auth_headers):
    r_start = client.post("/api/v1/challenges/transfer-task-auth-v1/start", headers=auth_headers)
    attempt_id = r_start.json()["id"]
    starter_code = r_start.json()["current_code"]

    # Submit unchanged vulnerable starter code
    r_sub = client.post(f"/api/v1/challenges/attempts/{attempt_id}/submit", json={
        "code": starter_code
    }, headers=auth_headers)

    assert r_sub.status_code == 200
    grade = r_sub.json()
    assert grade["status"] == "failed"
    assert grade["passed_all"] is False
    assert grade["score"] < 6
    assert any(t["passed"] is False for t in grade["test_results"])

def test_submit_correct_transfer_solution_passes(auth_headers):
    r_start = client.post("/api/v1/challenges/transfer-task-auth-v1/start", headers=auth_headers)
    attempt_id = r_start.json()["id"]
    starter_code = r_start.json()["current_code"]

    # Implement general object-level authorization check for organization
    fixed_code = starter_code.replace(
        "return task",
        """# Generalized object-level authorization check
    if task.get("org_id") != x_org_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cross-organization task access denied")
    return task"""
    )

    r_sub = client.post(f"/api/v1/challenges/attempts/{attempt_id}/submit", json={
        "code": fixed_code
    }, headers=auth_headers)

    assert r_sub.status_code == 200
    grade = r_sub.json()
    assert grade["status"] == "passed"
    assert grade["passed_all"] is True
    assert grade["score"] == 6
    assert grade["max_score"] == 6
    assert all(t["passed"] for t in grade["test_results"])
    assert "Outstanding" in grade["feedback"]

def test_learning_analytics_reflects_demonstrated_competency(auth_headers):
    # Fetch initial analytics
    r_an = client.get("/api/v1/analytics/overview", headers=auth_headers)
    assert r_an.status_code == 200
    data = r_an.json()
    assert "competencies" in data
    assert any(c["concept"] == "Broken Object-Level Authorization (IDOR)" for c in data["competencies"])
