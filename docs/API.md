# ProofForge AI — API Documentation

## Base URL
- Local: `http://localhost:8000/api/v1`

---

## Health & System Endpoints
- `GET /api/v1/health` — Basic service status
- `GET /api/v1/health/db` — Neon PostgreSQL connection status, cloud latency in ms, and provider info

---

## Authentication Endpoints (Phase 2)
- `POST /api/v1/auth/register` — Register new user (email, password, full_name)
- `POST /api/v1/auth/login` — Login and receive JWT bearer access token
- `GET /api/v1/auth/me` — Retrieve authenticated user profile

---

## Projects & Repositories Endpoints (Phases 2 & 4)
- `GET /api/v1/projects` — List authenticated user's projects
- `POST /api/v1/projects` — Create project manually
- `GET /api/v1/projects/{id}` — Retrieve project details, discovered components, and route metrics
- `POST /api/v1/projects/import` — Import and analyze GitHub repository (downloads zipball, runs AST parsing, extracts metadata)
- `DELETE /api/v1/projects/{id}` — Delete project and cascade-delete disk files and DB records
- `GET /api/v1/projects/{id}/files` — Deterministic project file tree (hierarchical directory structure)
- `GET /api/v1/projects/{id}/file-content?path={filePath}` — Read sanitized file content (path traversal defended)
- `POST /api/v1/projects/{id}/explain` — Grounded AI architecture and component explanation via Gemini

---

## Security Audit Engine Endpoints (Phase 5)
- `GET /api/v1/findings/scanners/status` — Returns operational availability and version for Semgrep, Gitleaks, OSV-Scanner, ESLint, TypeScript compiler, and Built-in AST scanner
- `POST /api/v1/projects/{id}/scan` — Triggers a full security and engineering audit scan across all 6 scanners, saving normalized findings to database
- `GET /api/v1/projects/{id}/scans` — Retrieves previous scan job runs, commit SHAs, and summary metrics
- `GET /api/v1/projects/{id}/findings?severity={sev}&category={cat}&scanner={tool}` — Retrieves normalized findings for project with optional filtering
- `GET /api/v1/findings/{id}` — Retrieves comprehensive details for a single security finding (verifying user project tenant ownership)

---

## AI Engineering Mentor Endpoints (Phase 6)
- `POST /api/v1/findings/{id}/mentor/explain` — Generates a 5-part grounded educational breakdown:
  1. Conceptual Vulnerability Breakdown
  2. Root Cause in this Codebase
  3. Attack Vector & Threat Model
  4. Safe Remediation Pattern
  5. Verification Test Strategy
  - Includes `cited_lines` and `citations_verified: boolean` based on physical source file verification.
  - Enforces prompt injection defense and secret masking guardrails.
- `POST /api/v1/findings/{id}/mentor/hint` — Delivers progressive Socratic guidance across 4 levels:
  - Request body: `{ "level": 1 | 2 | 3 | 4 }`
  - Response: `{ "finding_id": int, "level": int, "level_title": str, "hint_text": str, "next_level_available": bool }`

---

## Controlled Defect Reproduction Endpoints (Phase 7)
- `POST /api/v1/findings/{id}/reproduce` — Executes safe sandboxed reproduction test for the defect in an ephemeral runner (Docker / isolated subprocess):
  - Matches finding category to synthetic benchmark fixture
  - Runs isolated test with 30s timeout and zero network access
  - Returns: `{ "finding_id": int, "verification_status": "reproduction_verified", "runner_type": "isolated_subprocess" | "docker", "expected_behavior": str, "observed_behavior": str, "test_command": str, "exit_code": int, "execution_log": str, "timestamp": datetime }`
  - Persists reproducible evidence to Neon PostgreSQL database

---

## Guided Repair Studio & Verification Endpoints (Phases 8 & 9)
- `POST /api/v1/projects/{project_id}/findings/{finding_id}/repair-session` — Create or resume a persistent repair session for an identified vulnerability. Initializes ephemeral practice workspace with immutable template copy.
- `GET /api/v1/repair-sessions/{session_id}` — Retrieve repair session details, current editable code, original code, and unified diff.
- `PUT /api/v1/repair-sessions/{session_id}/draft` — Save in-progress draft to the isolated practice workspace (`app.py`, max 500KB); returns unified git diff.
- `POST /api/v1/repair-sessions/{session_id}/reset` — Reset practice workspace back to original immutable template fixture.
- `POST /api/v1/repair-sessions/{session_id}/hints` — Unlock progressive Socratic hints (Levels 1–4):
  - Level 1: Conceptual Root Cause
  - Level 2: Architectural Strategy
  - Level 3: Concrete Implementation Guidance
  - Level 4: Canonical Code Pattern
- `POST /api/v1/repair-sessions/{session_id}/coach` — Interactive Socratic AI coach Q&A grounded in current code and vulnerability context.
- `POST /api/v1/repair-sessions/{session_id}/verify` — Submit proposed patch for automated container verification:
  - Runs local Python AST syntax validation.
  - Applies code to ephemeral workspace.
  - Executes authoritative test suite inside hardened Docker sandbox (`proofforge-sandbox:latest` with network disabled, 512MB RAM, 1.0 CPU, read-only root, non-root user).
  - Evaluates positive access, unauthorized access, reverse tenancy access, and 404 missing resource handling.
  - Evaluates anti-shortcut checks (catches universal-deny regressions as `REGRESSION_DETECTED` and hardcoded single-case bypasses as `INCOMPLETE`).
  - Fails closed if Docker container isolation is unavailable (`SECURITY_BLOCKED`).
  - Returns detailed test results breakdown, before/after diff, and execution logs.
- `GET /api/v1/repair-sessions/{session_id}/patches` — Chronological history of patch verification attempts.

---

## Independent Skill Transfer Lab Endpoints (Phase 10)
- `GET /api/v1/challenges` — List available transfer challenges from the versioned challenge bank.
- `GET /api/v1/challenges/{challenge_id}` — Retrieve transfer challenge briefing, scenario, rules, starter code, and criteria.
- `POST /api/v1/challenges/{challenge_id}/start` (or `/attempt`) — Start or resume an independent challenge attempt with a clean student workspace.
- `PUT /api/v1/challenges/attempts/{attempt_id}/draft` — Save draft code in challenge workspace; returns unified git diff.
- `POST /api/v1/challenges/attempts/{attempt_id}/hint` — Request a conceptual hint (forfeits unassisted status, marks attempt as assisted/practiced).
- `POST /api/v1/challenges/attempts/{attempt_id}/submit` — Submit independent solution for blind evaluation:
  - Executes hidden test grader outside student workspace inside hardened Docker sandbox.
  - Tests 6 distinct criteria including multi-tenant access control and anti-shortcut verification.
  - Returns test-by-test breakdown, score (e.g. 6/6), pass/fail status, and feedback.

---

## Evidence-Based Learning Analytics Endpoints
- `GET /api/v1/analytics/overview` — Aggregates user engineering competency metrics directly from database records:
  - Total guided repairs verified
  - Total transfer challenges passed
  - Unassisted transfer count and rate (%)
  - Competency matrix (`MASTERED`, `IN_PROGRESS`, `NOT_STARTED`)
  - Chronological audit and verification activity timeline
