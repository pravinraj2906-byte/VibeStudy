import sys
import json
from fastapi.testclient import TestClient

def run_tests():
    outcomes = []
    
    # Test 1: Syntax & Import Check
    try:
        from app import app
        outcomes.append({
            "test_name": "Syntax & Module Import",
            "passed": True,
            "description": "FastAPI application imports cleanly without syntax or import errors.",
            "observed": "Import successful",
            "expected": "Valid Python module"
        })
    except Exception as e:
        outcomes.append({
            "test_name": "Syntax & Module Import",
            "passed": False,
            "description": "FastAPI application failed to import.",
            "observed": str(e),
            "expected": "Clean import"
        })
        print(json.dumps({
            "status": "EXECUTION_FAILED",
            "summary": f"Import or syntax error in app.py: {e}",
            "tests": outcomes
        }))
        sys.exit(1)

    client = TestClient(app)

    # Test 2: Positive Owner Access (Alice accessing Invoice 101)
    r_alice = client.get("/invoices/101", headers={"x-user-id": "user_alice"})
    alice_passed = (r_alice.status_code == 200 and r_alice.json().get("owner_id") == "user_alice")
    outcomes.append({
        "test_name": "Authorized Owner Access (Alice -> Invoice 101)",
        "passed": alice_passed,
        "description": "Legitimate owner should be granted HTTP 200 OK access to their confidential invoice.",
        "observed": f"HTTP {r_alice.status_code}",
        "expected": "HTTP 200 OK"
    })

    # Test 3: Unauthorized Cross-Tenant Negative Test (Bob accessing Invoice 101)
    r_bob = client.get("/invoices/101", headers={"x-user-id": "user_bob"})
    bob_blocked = (r_bob.status_code in (403, 404))
    outcomes.append({
        "test_name": "Unauthorized Cross-Tenant Access (Bob -> Invoice 101)",
        "passed": bob_blocked,
        "description": "Cross-tenant access to Alice's invoice must be rejected with HTTP 403 Forbidden or 404.",
        "observed": f"HTTP {r_bob.status_code}",
        "expected": "HTTP 403 Forbidden"
    })

    # Test 4: Regression & Anti-Shortcut Check (Bob accessing Invoice 102)
    # Prevents deny-all shortcuts (e.g. returning 403 for everything)
    r_bob_own = client.get("/invoices/102", headers={"x-user-id": "user_bob"})
    bob_own_passed = (r_bob_own.status_code == 200 and r_bob_own.json().get("owner_id") == "user_bob")
    outcomes.append({
        "test_name": "Regression Prevention: Legitimate Tenant Access (Bob -> Invoice 102)",
        "passed": bob_own_passed,
        "description": "Bob must still be able to retrieve his own legitimate invoice #102.",
        "observed": f"HTTP {r_bob_own.status_code}",
        "expected": "HTTP 200 OK"
    })

    # Test 5: Reverse Cross-Tenant Check (Alice accessing Invoice 102)
    # Prevents hardcoded special casing of invoice 101 only
    r_alice_cross = client.get("/invoices/102", headers={"x-user-id": "user_alice"})
    alice_cross_blocked = (r_alice_cross.status_code in (403, 404))
    outcomes.append({
        "test_name": "Generalization Check: Reverse Cross-Tenant (Alice -> Invoice 102)",
        "passed": alice_cross_blocked,
        "description": "Generalized authorization logic must protect all invoices, not just #101.",
        "observed": f"HTTP {r_alice_cross.status_code}",
        "expected": "HTTP 403 Forbidden"
    })

    # Test 6: Nonexistent Resource Check
    r_missing = client.get("/invoices/999", headers={"x-user-id": "user_alice"})
    missing_passed = (r_missing.status_code == 404)
    outcomes.append({
        "test_name": "Missing Resource Handling (Invoice 999)",
        "passed": missing_passed,
        "description": "Non-existent invoices should return HTTP 404 Not Found.",
        "observed": f"HTTP {r_missing.status_code}",
        "expected": "HTTP 404 Not Found"
    })

    # Determine overall status
    if not bob_blocked or not alice_cross_blocked:
        status = "INCOMPLETE"
        summary = "Defect still reproducible: endpoint fails to block cross-tenant unauthorized invoice access."
    elif not alice_passed or not bob_own_passed:
        status = "REGRESSION_DETECTED"
        summary = "Regression detected: legitimate authorized requests are being blocked. Avoid deny-all shortcuts."
    elif all(t["passed"] for t in outcomes):
        status = "VERIFIED_FIXED"
        summary = "All authorization and regression tests passed! Vulnerability successfully eliminated."
    else:
        status = "INCOMPLETE"
        summary = "Some edge cases failed. Ensure object-level ownership check is properly implemented."

    result = {
        "status": status,
        "summary": summary,
        "tests": outcomes
    }
    print(json.dumps(result))
    sys.exit(0 if status == "VERIFIED_FIXED" else 1)

if __name__ == "__main__":
    run_tests()
