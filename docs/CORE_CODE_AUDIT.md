# PROOFFORGE AI — CORE CODE & ARCHITECTURAL AUDIT REPORT
**Document Reference:** `docs/CORE_CODE_AUDIT.md`  
**Audit Type:** Independent Senior Software Architect, Security Engineer & Code Reviewer Audit  
**Date:** November 2, 2026  
**Repository:** `https://github.com/pravinraj2906-byte/VibeStudy`  
**Workspace:** `C:\Projects\ProofForge-AI`  
**Target Application:** `http://127.0.0.1:5173` (Vite Dev Server) | `http://127.0.0.1:8000` (FastAPI)  
**Target Workflow:** `/projects/135/repair` (Guided Repair Studio)  
**Audit Mode:** Strictly Read-Only (Zero Code Alterations, Zero DB Mutations, Zero Git Changes)  

---

## 1. ACTUAL SYSTEM ARCHITECTURE

ProofForge AI is an evidence-driven security auditing and engineering education platform built as a decoupled full-stack application with sandboxed containerized defect reproduction and deterministic skill transfer challenges.

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT APPLICATION                                   |
|  React 18.2.0 + TypeScript 5.2.2 + Vite 5.1.6 + Tailwind CSS 3.4.1 + Three.js 0.187.0    |
|  10 Core Views: Dashboard, Ingestion, Explorer, Security Audit, Repair Studio, etc.     |
+--------------------------------------------+--------------------------------------------+
                                             | HTTP / REST (JWT Bearer Auth)
                                             v
+-----------------------------------------------------------------------------------------+
|                                      BACKEND API                                        |
|  FastAPI 0.115.x + Uvicorn 0.28.0 + Python 3.12.10 + Pydantic v2 + SQLAlchemy 2.0.28    |
|  Routers: Auth, Projects, Findings, Repairs, Challenges, Analytics, Health              |
+---------------------+----------------------+---------------------+----------------------+
                      |                      |                     |
                      v                      v                     v
+-----------------------------+ +--------------------------+ +----------------------------+
|      DATABASE LAYER         | |        AI LAYER          | |     EXECUTION SANDBOX      |
| Neon Serverless PostgreSQL  | | Google Gemini API        | | Docker Desktop (WSL 2)     |
| AWS us-east-2 (neondb)      | | (gemini-1.5/2.0-flash)   | | proofforge-sandbox:latest   |
| Alembic Migration:          | | Multi-tier prompt safety | | --network none             |
| efdd62e51413 (Milestone C)  | | Offline fallback engine  | | --read-only, --cap-drop    |
+-----------------------------+ +--------------------------+ +----------------------------+
```

### 1.1 Backend Architecture
- **Runtime:** Python 3.12.10 running on Windows 11 under `.venv`.
- **API Framework:** FastAPI (`backend/app/main.py`) served via Uvicorn on `127.0.0.1:8000`.
- **Database ORM & Migrations:** SQLAlchemy 2.0.28 with psycopg2-binary 2.9.9 connected to remote Neon Serverless PostgreSQL (`ep-curly-moon-b5hlkmd6-pooler.c-7.us-east-2.aws.neon.tech`). Alembic is at revision `efdd62e51413_add_milestone_c_repair_and_transfer_`.
- **Authentication:** HS256 JSON Web Tokens (PyJWT 2.8.0) with bcrypt password hashing. User identity is resolved via FastAPI dependency injection (`get_current_user` in `backend/app/api/deps.py`).

### 1.2 Frontend Architecture
- **Framework & Bundler:** React 18.2.0, Vite 5.4.21, TypeScript 5.2.2.
- **Styling & Motion:** Tailwind CSS 3.4.1, Framer Motion 14.9.0, Lucide React 0.363.0.
- **3D Graphics:** Three.js 0.187.0 (`CodebaseConstellation3D.tsx`) for interactive codebase visual topology.
- **Routing:** React Router DOM 6.22.3 with route protection via `AuthContext.tsx`.

### 1.3 Execution Sandbox & Security Tooling
- **Container Engine:** Docker Desktop v28.x with WSL 2 Linux backend (`desktop-linux`).
- **Sandbox Image:** `proofforge-sandbox:latest` (hardened minimal container environment).
- **Scanner Subsystem (`backend/app/services/scanners/`):**
  - **Semgrep:** `SemgrepScanner` — Dockerized (`returntocorp/semgrep:latest`), Version: `1.182.1` (**Available: True**).
  - **Gitleaks:** `GitleaksScanner` — Dockerized (`zricethezav/gitleaks:latest`), Version: `v8.30.1` (**Available: True**).
  - **OSV-Scanner:** `OSVScanner` — Dockerized (`ghcr.io/google/osv-scanner:latest`), Version: `2.7.0` (**Available: True**).
  - **Built-in AST Scanner:** `BuiltinAstScanner` — Native Python AST parser, Version: `2.1.0` (**Available: True**).
  - **ESLint Scanner:** `ESLintScanner` — Checks for local/node binary (**Available: False** in backend Python PATH).
  - **TypeScript Scanner:** `TypeScriptScanner` — Checks for `tsc` binary (**Available: False** in backend Python PATH).

---

## 2. VERIFIED WORKING FUNCTIONALITY

Every item below was directly verified against live code execution and database queries:

1. **Backend Automated Test Suite:**
   - Command: `pytest tests -v`
   - Result: **58 passed, 0 failed, 1 warning in 834.49s (13m54s)**.
   - Modules covered: Analyzer (3 tests), Auth (6 tests), Benchmark Metrics (1 test), Grader Security (7 tests), Health (3 tests), Mentor Guardrails (2 tests), Projects & Tenant Isolation (3 tests), Repair Studio (6 tests), Controlled Reproduction (8 tests), Security Scans (3 tests), Security Edge Cases (3 tests), Skill Transfer (7 tests), Verification Pipeline (6 tests).
2. **Frontend Production Build:**
   - Command: `npm run build` (`tsc -b && vite build`)
   - Result: **Built successfully in 4.80s** with zero TypeScript errors. Transformed 1,928 modules cleanly into `dist/`.
3. **Authentication & Tenant Isolation (IDOR Defense):**
   - User registration and login return standard JWTs.
   - Cross-user tenant boundaries are strictly verified on:
     - `GET /api/v1/projects/{id}` -> returns HTTP 403 Forbidden on foreign projects.
     - `GET /api/v1/projects/{id}/findings` -> returns HTTP 403 Forbidden.
     - `GET /api/v1/projects/{id}/files` -> returns HTTP 403 Forbidden.
     - `POST /api/v1/projects/{id}/findings/{f_id}/repair-session` -> returns HTTP 404/403.
     - `GET /api/v1/challenges/attempts/{id}` -> returns HTTP 404 on foreign attempts.
4. **Hardened Docker Sandbox Execution:**
   - Verified Docker container isolation flags: `--network none`, `--memory 512m`, `--cpus 1.0`, `--user 1000:1000`, `--security-opt no-new-privileges`, `--cap-drop ALL`, `--read-only`, `--tmpfs /tmp:rw,noexec,nosuid,size=64m`.
   - Fail-closed security rule: untrusted repository code and student patches are strictly prohibited from executing on the host. If Docker is unavailable, the system returns `SECURITY_BLOCKED` via `fail_closed_policy`.
5. **Anti-Tampering Transfer Grader:**
   - In `backend/app/services/challenge/challenge_service.py`, student code is isolated in a read-only workspace mount (`/student_workspace:ro`) completely separate from the hidden grader suite (`/grader_suite:ro`).
   - Dynamic 48-character hex cryptographic tokens (`grader_token = secrets.token_hex(24)`) wrap test results to prevent adversary student code from spoofing test outputs.
6. **Secret Masking:**
   - `CodebaseAnalyzer.mask_secrets` masks high-entropy API keys, private keys, database connection strings, and tokens before sending file contents to frontend or AI models.
7. **Git Safety:**
   - `backend/.env` is strictly untracked and present in `.gitignore`. Local git working tree is clean on branch `main`.

---

## 3. PARTIALLY IMPLEMENTED FUNCTIONALITY

1. **Guided Repair Fixture Coupling:**
   - The Guided Repair studio (`RepairService`, `RepairVerifier`, `GuidedRepairPage`) operates on curated, isolated educational practice fixtures (`fixture_idor` with `app.py` and `verify_test.py`) rather than arbitrary source files of imported repositories.
   - When a user enters the Repair Studio for an imported project finding, the workspace manager initializes an ephemeral practice workspace from `backend/fixtures/fixture_idor/`. The verification pipeline deterministically grades against that fixture. While this represents sound pedagogical isolation, the UI does not explicitly state that the learner is working in a synthetic sandbox rather than directly patching their GitHub repo branch.
2. **Scanner Ecosystem Coverage:**
   - While Semgrep, Gitleaks, OSV-Scanner, and Builtin AST are fully functional through Docker and local Python, ESLint and TSC report `available=False` because Node-based global tools are not configured inside the backend's Python environment.
3. **Progressive Hinting Breadth:**
   - Socratic hints in `RepairService.request_hint` are currently hardcoded for IDOR / CWE-639 (Object-Level Authorization) across 4 structured levels. For other finding categories, it provides generic guidance.

---

## 4. BROKEN OR MISSING COMPONENTS

### 4.1 Target Workflow `/projects/135/repair` — Empty State Freezing / Unhandled Null State
- **Context:** Project 135 (`ai-powered-project-task-platform`) was imported by user `praveensagarm2007@gmail.com` (User ID: 159). The project status is `ready`, but **findings count is currently 0** because Milestone B security scans (`POST /api/v1/projects/135/scan`) were not triggered after import.
- **Root Cause in Frontend (`frontend/src/pages/GuidedRepairPage.tsx`, lines 68-89):**
  ```typescript
  const fList = await api.getProjectFindings(projectId);
  setFindings(fList);
  let targetFindingId = selectedFindingId;
  if (!targetFindingId && fList.length > 0) {
    const preferred = fList.find(f => f.cwe_id === 'CWE-639' || f.category === 'security') || fList[0];
    targetFindingId = preferred.id;
    setSelectedFindingId(preferred.id);
  }
  if (targetFindingId) {
    await loadSession(projectId, targetFindingId);
  }
  ```
- **Observed Behavior:**
  - Because `fList.length === 0`, `targetFindingId` evaluates to `null`.
  - `loadSession` is never called, leaving `session === null`, `code === ""`, and `findings === []`.
  - The UI renders an empty code editor with 0 lines, no CWE badge, an empty diff preview, and inactive buttons (`Save Draft`, `Reset`, and `Run Automated Verification` all execute `if (!session) return;` and do nothing).
  - There is no empty-state message directing the user: *"No security vulnerabilities detected for this project. Run an audit first."*
- **Cross-Tenant Behavior:**
  - If any user other than User 159 (e.g. `testuser_phase1@proofforge.ai`) visits `/projects/135/repair`, the backend returns HTTP 403 Forbidden (`{"success":false,"error":{"code":403,"message":"Access denied"}}`).
  - The frontend captures this error and displays a small red text banner, but leaves the user trapped on the broken repair screen without a navigation fallback.

### 4.2 Missing Frontend ESLint Configuration
- `frontend/package.json` includes `"eslint": "^10.14.0"`, but no `eslint.config.js` exists in `frontend/`.
- Executing `npx eslint src` immediately fails with:
  `ESLint couldn't find an eslint.config.* file.`

### 4.3 Frontend Monolithic Bundle Warning
- Running `npm run build` produces a single JavaScript bundle chunk of **1,016.74 kB** (`dist/assets/index-Cihg3Oqt.js`).
- Vite outputs a performance warning because the chunk exceeds 500 kB. Three.js and Framer Motion are bundled synchronously into the primary entry bundle instead of being code-split.

---

## 5. SECURITY WEAKNESSES & RISK ASSESSMENT

| Finding ID | Severity | Category / CWE | Description & Actual Behavior | Remediation |
|---|---|---|---|---|
| **SEC-01** | **Medium** | CWE-639 / OWASP A01 (Broken Access Control) | **Frontend Cross-Tenant Trapping:** While backend routes strictly enforce tenant isolation and return HTTP 403, the frontend `GuidedRepairPage` does not redirect unauthorized callers to `/dashboard` or show a dedicated access-denied view. | Add an explicit error boundary or redirect when `err.status === 403`. |
| **SEC-02** | **Low** | CWE-755 / OWASP A05 (Security Misconfiguration) | **Neon Serverless Cold-Start Latency:** Autosuspension of the free Neon Postgres compute causes initial TCP connection latency of 15–20s or transient DNS timeouts on cold wakeups. | Implement backend connection retry wrappers and frontend cold-start skeleton loaders. |
| **SEC-03** | **Low** | CWE-1188 / OWASP A04 (Insecure Design) | **Cognitive Mismatch in Repair Scope:** Learner might believe their proposed patch will be committed to their live GitHub repo, whereas it is safely executed inside an educational fixture workspace. | Add an explicit disclaimer: "Practicing in ephemeral educational sandbox". |
| **SEC-04** | **Informational**| CWE-707 / OWASP A03 (Injection) | **Prompt Injection Guardrails:** LLM prompts in `GeminiService` use explicit system delimiters and safety rules; verified by automated tests in `test_mentor.py`. | Continue maintaining strict system instruction boundaries. |

---

## 6. SOURCE FILE PATHS & LINE REFERENCES

1. **Guided Repair Frontend Entry:**
   - [`frontend/src/pages/GuidedRepairPage.tsx#L40-L95`](file:///C:/Projects/ProofForge-AI/frontend/src/pages/GuidedRepairPage.tsx#L40-L95) — Route initialization, finding resolution, and empty-state vulnerability.
   - [`frontend/src/pages/GuidedRepairPage.tsx#L153-L180`](file:///C:/Projects/ProofForge-AI/frontend/src/pages/GuidedRepairPage.tsx#L153-L180) — Verification invocation and state handlers.
2. **Repair Backend Routes & Ownership:**
   - [`backend/app/api/v1/repairs.py#L20-L55`](file:///C:/Projects/ProofForge-AI/backend/app/api/v1/repairs.py#L20-L55) — `POST .../repair-session` endpoint and user permission checks.
   - [`backend/app/services/repair/repair_service.py#L18-L65`](file:///C:/Projects/ProofForge-AI/backend/app/services/repair/repair_service.py#L18-L65) — `get_or_create_session` project and finding validation.
3. **Hardened Docker Verification Runner:**
   - [`backend/app/services/repair/verifier.py#L87-L121`](file:///C:/Projects/ProofForge-AI/backend/app/services/repair/verifier.py#L87-L121) — Fail-closed check and hardened container execution command.
   - [`backend/app/services/repair/workspace_manager.py#L38-L51`](file:///C:/Projects/ProofForge-AI/backend/app/services/repair/workspace_manager.py#L38-L51) — Path traversal prevention (`validate_file_path`).
4. **Transfer Challenge Isolation & Token Grader:**
   - [`backend/app/services/challenge/challenge_service.py#L355-L385`](file:///C:/Projects/ProofForge-AI/backend/app/services/challenge/challenge_service.py#L355-L385) — Separated `/student_workspace:ro` and `/grader_suite:ro` mounts with cryptographically signed tokens.
5. **Project Ingestion & Scans:**
   - [`backend/app/api/v1/projects.py#L110-L160`](file:///C:/Projects/ProofForge-AI/backend/app/api/v1/projects.py#L110-L160) — Repository import logic.
   - [`backend/app/api/v1/projects.py#L329-L353`](file:///C:/Projects/ProofForge-AI/backend/app/api/v1/projects.py#L329-L353) — Security scan trigger endpoint (`POST /projects/{id}/scan`).

---

## 7. TEST & VERIFICATION RESULTS

### 7.1 Backend Pytest Execution
- **Command:** `cd backend; .venv\Scripts\pytest tests -v`
- **Total Tests:** 58
- **Passed:** 58 (100%)
- **Failed:** 0
- **Duration:** 834.49 seconds (13 minutes, 54 seconds)
- **Breakdown:**
  - `test_analyzer.py`: 3/3 passed
  - `test_auth.py`: 6/6 passed
  - `test_benchmark_metrics.py`: 1/1 passed
  - `test_grader_security.py`: 7/7 passed
  - `test_health.py`: 3/3 passed
  - `test_mentor.py`: 2/2 passed
  - `test_projects.py`: 3/3 passed
  - `test_repair_studio.py`: 6/6 passed
  - `test_reproduction.py`: 8/8 passed
  - `test_security_audit.py`: 3/3 passed
  - `test_security_edge_cases.py`: 3/3 passed
  - `test_skill_transfer.py`: 7/7 passed
  - `test_verification_pipeline.py`: 6/6 passed

### 7.2 Frontend Production Build
- **Command:** `cd frontend; npm run build`
- **Result:** Code compiled with zero TypeScript compiler errors (`tsc -b && vite build`).
- **Assets Generated:**
  - `dist/index.html` (0.93 kB)
  - `dist/assets/index-iYPoqchE.css` (39.93 kB)
  - `dist/assets/index-Cihg3Oqt.js` (1,016.74 kB)

---

## 8. ARCHITECTURAL RISKS

1. **Remote Neon Database Dependency:**
   - Neon serverless compute autosuspends during inactivity. Cold starts can take up to 18 seconds, which may cause frontend requests to time out if network timeouts are aggressive.
2. **Frontend Bundle Weight:**
   - Synchronous import of Three.js and Framer Motion balloons the initial bundle to over 1MB, which degrades Time to Interactive (TTI) on lower-end devices.
3. **Hardcoded Educational Fixtures vs Arbitrary Repositories:**
   - While the current architecture safely models real vulnerabilities without exposing the host to untrusted repo code execution, extending the Repair Studio to custom user code in future milestones will require building a dynamic container image synthesis pipeline.

---

## 9. PRIORITY-RANKED REMEDIATION PLAN

### Priority 0 (Must be addressed alongside frontend redesign)
1. **Fix `GuidedRepairPage.tsx` Empty & Unauthorized States:**
   - Handle `findings.length === 0`: render an informative "No Security Findings" screen with a direct button to "Trigger Security Audit".
   - Handle HTTP 403 Forbidden: render a clean "Access Denied" view with a link back to "My Projects".
   - Handle missing session: disable the editor gracefully and display actionable instructions.

### Priority 1 (High priority frontend engineering)
2. **Configure ESLint:**
   - Create a modern flat `frontend/eslint.config.js` to restore automated linting.
3. **Vite Code-Splitting:**
   - In `frontend/vite.config.ts`, configure `rollupOptions.output.manualChunks` to split `vendor-three` and `vendor-react` into separate lazy-loaded chunks.
4. **Cold-Start Indicator:**
   - Add a subtle status banner or spinner when the database latency exceeds 3 seconds.

### Priority 2 (Medium priority enhancements)
5. **Multi-CWE Fixture Routing:**
   - Update `RepairService` to dynamically load `fixture_xss`, `fixture_secret`, or `fixture_dependency` depending on the selected finding's CWE identifier.

---

## 10. BACKEND READINESS & VERDICT

### Overall Audit Verdict: **CONDITIONAL GO**

#### Rationale:
1. **The Backend Core is Production-Grade:**
   - All 58 backend tests pass cleanly.
   - Authentication, database schemas, Alembic migrations, tenant isolation, and IDOR protection are complete and rigorously enforced.
   - The Docker sandbox executes with strict military-grade containment (`--network none`, `--cap-drop ALL`, read-only mounts, and signed grader tokens).
2. **Why "Conditional" instead of unconditional "GO":**
   - The frontend redesign must **NOT** be built purely as a cosmetic layer on top of assumptions. It **must** explicitly resolve the empty-state and error-state edge cases discovered during this audit (specifically on `/projects/135/repair` when 0 findings exist, or when unauthorized tenants access a project).
   - The frontend redesign can proceed immediately provided that the UI engineering encompasses these state handling improvements.
