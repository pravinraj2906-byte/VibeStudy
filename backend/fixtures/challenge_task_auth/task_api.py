# Transfer Challenge: Cross-Organization Task Access Prevention
# Technology: FastAPI Project Collaboration Microservice
from fastapi import FastAPI, HTTPException, Header
from typing import Optional

app = FastAPI(title="ProjectTaskService")

# In-memory mock database of tasks across organizations
TASKS = {
    501: {
        "id": 501,
        "org_id": "org_alpha",
        "title": "Quarterly Security Audit Plan",
        "assignee": "alice_dev",
        "classification": "CONFIDENTIAL_INTERNAL"
    },
    502: {
        "id": 502,
        "org_id": "org_beta",
        "title": "Public Marketing Campaign Assets",
        "assignee": "bob_pm",
        "classification": "ORGANIZATION_INTERNAL"
    },
}

@app.get("/organizations/{org_id}/tasks/{task_id}")
def get_task(
    org_id: str,
    task_id: int,
    x_org_id: str = Header("org_beta"),
    x_user_id: str = Header("user_bob")
):
    """
    VULNERABLE ENDPOINT:
    Authenticates caller membership headers, but FAILS to verify that the
    requested task belongs to the caller's organization (x_org_id)!
    
    A user from org_beta can read confidential task #501 belonging to org_alpha.
    """
    if task_id not in TASKS:
        raise HTTPException(status_code=404, detail="Task not found")

    task = TASKS[task_id]

    # MISSING AUTHORIZATION CHECK:
    # Ensure caller belongs to the task's organization before returning record!

    return task
