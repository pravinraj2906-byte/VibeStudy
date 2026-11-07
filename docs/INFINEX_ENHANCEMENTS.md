# INFINEX 2K26 Enhancement Notes

## What changed

### Personal mentor memory

- Added the `mentor_memories` database table and Alembic migration `a7b8c9d0e1f2`.
- Added authenticated `GET` and `PUT` endpoints at `/api/v1/projects/{project_id}/mentor-memory`.
- Memory is isolated by both `user_id` and `project_id`.
- The frontend keeps a versioned local fallback and synchronizes the learning goal, teaching mode, topic trail, and the latest 30 messages when the API is available.
- Repository source, secrets, and credentials are not stored in mentor memory.

### Friendly project-wide AI mentor

- The mentor now teaches the whole project when no security finding is selected.
- Responses are prompted to use plain language, one repository-connected example, a practical next step, and a check-for-understanding question.
- Users can choose guided, concise, or deep-dive teaching.
- Security-finding explanations and progressive four-level hints remain available.

### Evidence-based project review

- Added a transparent repository-evidence score on the project overview.
- The score covers architecture visibility, security posture, delivery readiness, and explainability.
- Each score shows the repository signals that affected it and explicitly warns that it is not a production-safety guarantee.
- Recommended next steps change according to unresolved findings, environment documentation, and Docker evidence.

### Responsive diagrams

- Added a workflow diagram from repository import through code intelligence, architecture mapping, mentoring, verification, and skill transfer.
- Added a five-layer system diagram covering experience, application, intelligence, evidence, and safety boundaries.
- Both diagrams stack vertically on smaller screens and become horizontal at wide desktop sizes.

## Deployment step

Run the new database migration before deploying the updated frontend:

```powershell
cd backend
python -m alembic upgrade head
```

The frontend remains usable if the memory endpoint is temporarily unavailable; it reports local-only memory and retains the user/project-scoped browser fallback.

## Verification performed on 7 November 2026

- Frontend production build: passed (`tsc -b` and Vite build).
- New mentor-memory API tests: 2 passed, covering persistence and cross-user access denial.
- Python application compilation: passed.
- Full existing backend suite: 56 passed and 8 environment-dependent failures. One failure requires a valid Gemini API key; seven require an available Docker daemon for isolated execution.
- Browser flow: authenticated project review rendered, mobile layout remained readable, mentor memory reached the synced state, and a changed goal survived a full reload.

