import sys
import os
import io
import json
import argparse
from contextlib import redirect_stdout, redirect_stderr
from fastapi.testclient import TestClient

def emit_result(status, score, max_score, passed_all, tests, feedback, token=None):
    payload = json.dumps({
        "status": status,
        "score": score,
        "max_score": max_score,
        "passed_all": passed_all,
        "tests": tests,
        "feedback": feedback
    })
    if token:
        print(f"<<<PROOFFORGE_GRADER_TOKEN_START:{token}>>>")
        print(payload)
        print(f"<<<PROOFFORGE_GRADER_TOKEN_END:{token}>>>")
    else:
        print(payload)

def run_grading():
    parser = argparse.ArgumentParser(description="Authoritative Blind Challenge Grader")
    parser.add_argument("--student-dir", default=".", help="Path to student code directory")
    parser.add_argument("--token", default=None, help="Signature nonce for tamper-proof evaluation")
    args, _ = parser.parse_known_args()

    # Isolate student code path
    student_dir = os.path.abspath(args.student_dir)
    if student_dir not in sys.path:
        sys.path.insert(0, student_dir)

    outcomes = []
    
    # 1. Syntax & Safe Microservice Import
    # Intercept stdout/stderr during student module load to prevent output manipulation
    captured_stdout = io.StringIO()
    captured_stderr = io.StringIO()
    app = None

    try:
        with redirect_stdout(captured_stdout), redirect_stderr(captured_stderr):
            from task_api import app
        
        if app is None:
            raise ImportError("task_api module did not export a valid 'app' FastAPI instance.")

        outcomes.append({
            "name": "Syntax & Microservice Import",
            "passed": True,
            "description": "FastAPI service loads cleanly without syntax or import errors.",
            "details": "Import successful"
        })
    except SystemExit as se:
        outcomes.append({
            "name": "Syntax & Microservice Import",
            "passed": False,
            "description": "Student code attempted early process termination (sys.exit).",
            "details": f"SystemExit({se})"
        })
        emit_result("failed", 0, 6, False, outcomes, "Execution halted: Student code invoked sys.exit() on import.", args.token)
        sys.exit(1)
    except Exception as e:
        outcomes.append({
            "name": "Syntax & Microservice Import",
            "passed": False,
            "description": "FastAPI service failed to import.",
            "details": str(e)
        })
        emit_result("failed", 0, 6, False, outcomes, f"Syntax error prevented execution: {e}", args.token)
        sys.exit(1)

    client = TestClient(app)

    # 2. Positive Test: Org Alpha Member accessing Task 501 (Org Alpha)
    r1 = client.get("/organizations/org_alpha/tasks/501", headers={"x-org-id": "org_alpha", "x-user-id": "alice_dev"})
    p1 = (r1.status_code == 200 and r1.json().get("org_id") == "org_alpha")
    outcomes.append({
        "name": "Authorized Tenant Access (Org Alpha -> Task 501)",
        "passed": p1,
        "description": "Legitimate member of Org Alpha should receive HTTP 200 OK for their task.",
        "details": f"Observed HTTP {r1.status_code}"
    })

    # 3. Negative Cross-Org Test: Org Beta Member accessing Task 501 (Org Alpha)
    r2 = client.get("/organizations/org_alpha/tasks/501", headers={"x-org-id": "org_beta", "x-user-id": "bob_pm"})
    p2 = (r2.status_code in (403, 404))
    outcomes.append({
        "name": "Unauthorized Cross-Org Access (Org Beta -> Task 501)",
        "passed": p2,
        "description": "Cross-organization request from Org Beta to Org Alpha task must be rejected with 403 Forbidden.",
        "details": f"Observed HTTP {r2.status_code}"
    })

    # 4. Legitimate Second Tenant Test: Org Beta Member accessing Task 502 (Org Beta)
    # Anti-shortcut: catches deny-all implementations
    r3 = client.get("/organizations/org_beta/tasks/502", headers={"x-org-id": "org_beta", "x-user-id": "bob_pm"})
    p3 = (r3.status_code == 200 and r3.json().get("org_id") == "org_beta")
    outcomes.append({
        "name": "Regression Check: Legitimate Tenant Access (Org Beta -> Task 502)",
        "passed": p3,
        "description": "Org Beta member must be able to retrieve their own task 502.",
        "details": f"Observed HTTP {r3.status_code}"
    })

    # 5. Reverse Cross-Org Test: Org Alpha Member accessing Task 502 (Org Beta)
    # Anti-shortcut: catches hardcoding Task 501 or Org Alpha only
    r4 = client.get("/organizations/org_beta/tasks/502", headers={"x-org-id": "org_alpha", "x-user-id": "alice_dev"})
    p4 = (r4.status_code in (403, 404))
    outcomes.append({
        "name": "Generalization Check: Reverse Cross-Org (Org Alpha -> Task 502)",
        "passed": p4,
        "description": "Generalized organization check must protect all organization tasks.",
        "details": f"Observed HTTP {r4.status_code}"
    })

    # 6. Missing Task Handling
    r5 = client.get("/organizations/org_alpha/tasks/999", headers={"x-org-id": "org_alpha", "x-user-id": "alice_dev"})
    p5 = (r5.status_code == 404)
    outcomes.append({
        "name": "Nonexistent Task Handling",
        "passed": p5,
        "description": "Nonexistent task queries should return HTTP 404 Not Found.",
        "details": f"Observed HTTP {r5.status_code}"
    })

    passed_count = sum(1 for t in outcomes if t["passed"])
    max_count = len(outcomes)
    passed_all = (passed_count == max_count)

    if passed_all:
        status = "passed"
        feedback = "Outstanding! You independently generalized the object-level authorization pattern to a completely new domain without introducing regressions."
    elif not p2 or not p4:
        status = "failed"
        feedback = "Defect still present: unauthorized members can access tasks belonging to other organizations."
    elif not p1 or not p3:
        status = "failed"
        feedback = "Regression detected: legitimate users are unable to access their own organization's tasks."
    else:
        status = "failed"
        feedback = "Some behavioral checks failed. Ensure general tenant validation is implemented."

    emit_result(status, passed_count, max_count, passed_all, outcomes, feedback, args.token)
    sys.exit(0 if passed_all else 1)

if __name__ == "__main__":
    run_grading()
