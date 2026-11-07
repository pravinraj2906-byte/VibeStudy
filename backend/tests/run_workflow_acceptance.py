import httpx
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_workflow_test():
    client = httpx.Client(timeout=45.0)

    print("=== STEP 1: VERIFY HEALTH & DB READINESS ===")
    r_health = client.get(f"{BASE_URL}/health")
    assert r_health.status_code == 200, f"Health check failed: {r_health.text}"
    print("Health response:", r_health.json())

    r_db = client.get(f"{BASE_URL}/health/db")
    assert r_db.status_code == 200, f"DB check failed: {r_db.text}"
    print("DB readiness response:", r_db.json())

    print("\n=== STEP 2: USER AUTHENTICATION ===")
    unique_user = f"e2e_engineer_{int(time.time())}@proofforge.ai"
    reg_payload = {
        "email": unique_user,
        "password": "E2ePassword123!",
        "full_name": "E2E Lead Engineer"
    }
    r_reg = client.post(f"{BASE_URL}/auth/register", json=reg_payload)
    assert r_reg.status_code == 201, f"Register failed: {r_reg.text}"
    token_data = r_reg.json()
    token = token_data["access_token"]
    user_id = token_data["user"]["id"]
    print(f"User registered successfully. ID: {user_id}, Email: {unique_user}")

    headers = {"Authorization": f"Bearer {token}"}
    r_me = client.get(f"{BASE_URL}/auth/me", headers=headers)
    assert r_me.status_code == 200
    print("Profile verification:", r_me.json())

    print("\n=== STEP 3: REPOSITORY IMPORT & INTELLIGENCE ===")
    # Controlled repo: Praveensagar07/ProofForge-AI
    import_payload = {
        "repo_url": "https://github.com/Praveensagar07/ProofForge-AI",
        "branch": "main"
    }
    print(f"Importing repository {import_payload['repo_url']}...")
    r_import = client.post(f"{BASE_URL}/projects/import", json=import_payload, headers=headers)
    assert r_import.status_code == 201, f"Import failed: {r_import.text}"
    project_data = r_import.json()
    project_id = project_data["id"]
    print(f"Repository imported! Project ID: {project_id}")
    print(f"Name: {project_data['name']}")
    print(f"Framework: {project_data.get('framework')}")
    print(f"Commit SHA: {project_data.get('commit_sha')}")

    print("\n=== STEP 4: FILE TREE & EXPLORER ===")
    r_files = client.get(f"{BASE_URL}/projects/{project_id}/files", headers=headers)
    assert r_files.status_code == 200, f"Files failed: {r_files.text}"
    files_data = r_files.json()
    print(f"File tree retrieved with {len(files_data['tree'])} top-level nodes:")
    for node in files_data['tree']:
        print(f" - [{node['type']}] {node['name']}")

    print("\n=== STEP 5: SAFE SANITIZED FILE READER ===")
    r_content = client.get(
        f"{BASE_URL}/projects/{project_id}/file-content?path=README.md",
        headers=headers
    )
    assert r_content.status_code == 200, f"File content failed: {r_content.text}"
    content_data = r_content.json()
    print("README content sample:", content_data['content'][:120])

    print("\n=== STEP 6: GROUNDED AI EXPLANATION ===")
    explain_payload = {
        "file_path": "README.md",
        "symbol_name": "ProjectOverview",
        "query": "Explain the architectural mission of ProofForge AI and how it helps vibe coders."
    }
    r_explain = client.post(
        f"{BASE_URL}/projects/{project_id}/explain",
        json=explain_payload,
        headers=headers
    )
    assert r_explain.status_code == 200, f"Explain failed: {r_explain.text}"
    explain_data = r_explain.json()
    print("AI Explanation received:")
    print(explain_data['explanation'][:350] + "...")
    print(f"Source references cited: {len(explain_data.get('source_references', []))}")

    print("\n=== STEP 7: VERIFY NEON POSTGRESQL PERSISTENCE ===")
    r_proj = client.get(f"{BASE_URL}/projects/{project_id}", headers=headers)
    assert r_proj.status_code == 200
    assert r_proj.json()["id"] == project_id
    print("Project successfully verified in Neon PostgreSQL!")

    print("\n=======================================================")
    print(">>> ALL 7 WORKFLOW ACCEPTANCE STEPS PASSED SUCCESSFULLY! <<<")
    print("=======================================================")

if __name__ == "__main__":
    run_workflow_test()
