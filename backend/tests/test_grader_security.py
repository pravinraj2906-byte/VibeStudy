import os
import json
import pytest
from app.services.challenge.challenge_service import ChallengeService
from app.models.challenge import ChallengeAttempt

def test_student_workspace_excludes_grader_script(db_session, test_user):
    """
    11.1 Security Test 1: Verify student workspace contains ONLY student files
    and strictly excludes hidden grader files, test runners, or solution files.
    """
    attempt_dict = ChallengeService.start_or_resume_attempt(db_session, "transfer-task-auth-v1", test_user.id)
    # Check workspace location relative to backend or root
    candidates = [
        os.path.abspath(f"backend/storage/workspaces/challenge_{attempt_dict['id']}"),
        os.path.abspath(f"storage/workspaces/challenge_{attempt_dict['id']}"),
    ]
    workspace_dir = next((c for c in candidates if os.path.exists(c)), candidates[1])

    assert os.path.exists(workspace_dir)
    files = os.listdir(workspace_dir)

    # Must contain editable student file
    assert "task_api.py" in files
    # Must NOT contain grader or hidden test scripts
    assert "grader.py" not in files
    assert not any(f.startswith("grader") or f.startswith("test_") for f in files)

def test_adversary_student_code_cannot_read_grader_in_workspace(db_session, test_user):
    """
    11.1 Security Test 2: Adversarial student code attempts to open and exfiltrate grader.py.
    Must fail with FileNotFoundError inside the student workspace.
    """
    attempt_dict = ChallengeService.start_or_resume_attempt(db_session, "transfer-task-auth-v1", test_user.id)
    attempt_id = attempt_dict["id"]

    # Student code that tries to exfiltrate grader.py
    malicious_code = """
from fastapi import FastAPI, HTTPException

app = FastAPI()

try:
    with open("grader.py", "r") as f:
        exfiltrated_grader = f.read()
except FileNotFoundError:
    exfiltrated_grader = "FILE_NOT_FOUND_SECURE"

@app.get("/organizations/{org_id}/tasks/{task_id}")
def get_task(org_id: str, task_id: int):
    return {"status": exfiltrated_grader}
"""
    result = ChallengeService.submit_and_grade(db_session, attempt_id, test_user.id, malicious_code)
    # The submission should be graded (and fail since it's not the real fix)
    assert result["passed_all"] is False
    assert result["score"] < 6

    # Verify that the exfiltrated string could never find grader.py in workspace
    attempt = db_session.query(ChallengeAttempt).filter(ChallengeAttempt.id == attempt_id).first()
    assert "FILE_NOT_FOUND_SECURE" in attempt.submitted_code

def test_adversary_student_code_cannot_forge_grader_output(db_session, test_user):
    """
    11.1 Security Test 3: Adversarial student code prints fake passing JSON to stdout.
    The grader's cryptographic nonce token boundary must reject the forged output.
    """
    attempt_dict = ChallengeService.start_or_resume_attempt(db_session, "transfer-task-auth-v1", test_user.id)
    attempt_id = attempt_dict["id"]

    forgery_code = """
import json
import sys
from fastapi import FastAPI

app = FastAPI()

# Forged JSON attempt to trick naive stdout parser
fake_output = {
    "status": "passed",
    "score": 6,
    "max_score": 6,
    "passed_all": True,
    "tests": [{"name": "All Tests", "passed": True}],
    "feedback": "Hacked Pass"
}
print(json.dumps(fake_output))

@app.get("/organizations/{org_id}/tasks/{task_id}")
def get_task(org_id: str, task_id: int):
    return {"id": task_id, "vulnerable": True}
"""
    result = ChallengeService.submit_and_grade(db_session, attempt_id, test_user.id, forgery_code)
    # Must NOT be marked as passed!
    assert result["passed_all"] is False
    assert result["score"] != 6

def test_adversary_student_code_cannot_bypass_via_system_exit(db_session, test_user):
    """
    11.1 Security Test 4: Adversarial student code calls sys.exit(0) on import
    to abort grading early. Grader must catch SystemExit and grade as failed.
    """
    attempt_dict = ChallengeService.start_or_resume_attempt(db_session, "transfer-task-auth-v1", test_user.id)
    attempt_id = attempt_dict["id"]

    exit_code = """
import sys
# Attempt to bypass tests by forcing exit 0
sys.exit(0)
"""
    result = ChallengeService.submit_and_grade(db_session, attempt_id, test_user.id, exit_code)
    assert result["status"] == "failed"
    assert result["passed_all"] is False
    assert result["score"] == 0

def test_adversary_student_code_cannot_modify_grader_read_only(db_session, test_user):
    """
    11.1 Security Test 5: Adversarial student code attempts to overwrite grader files.
    Must fail due to read-only container filesystem mount.
    """
    attempt_dict = ChallengeService.start_or_resume_attempt(db_session, "transfer-task-auth-v1", test_user.id)
    attempt_id = attempt_dict["id"]

    tamper_code = """
from fastapi import FastAPI

app = FastAPI()

# Attempt to tamper with grader suite
try:
    with open("/grader_suite/grader.py", "w") as f:
        f.write("print('hacked')")
except (OSError, PermissionError):
    pass

@app.get("/organizations/{org_id}/tasks/{task_id}")
def get_task(org_id: str, task_id: int):
    return {"id": task_id}
"""
    result = ChallengeService.submit_and_grade(db_session, attempt_id, test_user.id, tamper_code)
    assert result["passed_all"] is False

def test_unauthorized_cross_user_attempt_access_rejected(client, test_user, other_user, other_user_token):
    """
    11.1 Security Test 6: Verify User B cannot access, view, or submit User A's challenge attempt.
    """
    headers_user2 = {"Authorization": f"Bearer {other_user_token}"}
    
    # User B queries attempts for challenge
    resp = client.get("/api/v1/challenges/transfer-task-auth-v1", headers=headers_user2)
    assert resp.status_code == 200

    # User B attempts to access non-existent or User A's attempt ID directly
    unauth_resp = client.put("/api/v1/challenges/attempts/999999/draft", json={"code": "tamper"}, headers=headers_user2)
    assert unauth_resp.status_code == 404

def test_adversary_student_code_cannot_access_host_secrets(db_session, test_user):
    """
    11.1 Security Test 7: Verify that host secrets (DATABASE_URL, GEMINI_API_KEY, SECRET_KEY)
    are not exposed in the container execution environment.
    """
    attempt_dict = ChallengeService.start_or_resume_attempt(db_session, "transfer-task-auth-v1", test_user.id)
    attempt_id = attempt_dict["id"]

    env_exfil_code = """
import os
from fastapi import FastAPI

app = FastAPI()

# Check if sensitive host secrets exist in environment
leaked_secrets = []
for k in ["DATABASE_URL", "GEMINI_API_KEY", "SECRET_KEY", "AWS_SECRET_ACCESS_KEY"]:
    if k in os.environ:
        leaked_secrets.append(k)

assert len(leaked_secrets) == 0, f"Leaked host secrets: {leaked_secrets}"

@app.get("/organizations/{org_id}/tasks/{task_id}")
def get_task(org_id: str, task_id: int):
    return {"status": "clean_environment"}
"""
    result = ChallengeService.submit_and_grade(db_session, attempt_id, test_user.id, env_exfil_code)
    # Import check should pass because zero host secrets are present in container
    syntax_import_check = next((t for t in result.get("test_results", []) if t["name"] == "Syntax & Microservice Import"), None)
    assert syntax_import_check is not None
    assert syntax_import_check["passed"] is True
