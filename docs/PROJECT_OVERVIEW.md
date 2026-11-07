> Historical project overview. Milestone/test claims below are development records, not a current CI or production capability guarantee. See the root README for current setup and hosted limitations.

# ProofForge AI

<p align="center">
  <img src="https://img.shields.io/badge/Status-Milestone%20D%20Verified-0ea5e9?style=for-the-badge" alt="Status: Milestone D Verified" />
  <img src="https://img.shields.io/badge/Tests-58%2F58%20Passing%20(100%25)-10b981?style=for-the-badge" alt="Tests: 58/58 Passing" />
  <img src="https://img.shields.io/badge/Benchmark-100%25%20Precision%20%7C%20Recall-8b5cf6?style=for-the-badge" alt="Benchmark: 100% Precision" />
  <img src="https://img.shields.io/badge/Grader-Cryptographically%20Sealed-f59e0b?style=for-the-badge" alt="Grader: Cryptographically Sealed" />
</p>

<h3 align="center">
  <strong>From Vibe Coding to Real Engineering</strong>
</h3>

<p align="center">
  <em>An automated AI Engineering Coach that audits source code, reproduces exploits in hardened Docker sandboxes, guides developers through Socratic problem-solving, authoritatively verifies repairs against regression test harnesses, and validates genuine conceptual mastery in blind skill transfer labs.</em>
</p>

---

## 🎯 Product Mission & The Problem

The emergence of AI-assisted code generation ("vibe coding") has supercharged software velocity. However, developer reliance on conversational LLMs introduces systemic risks:

1. **Plausible but Insecure Fixes:** LLMs hallucinate security fixes that look superficially valid but introduce catastrophic regressions (e.g., universal authorization bypasses, weakened cryptographic settings).
2. **Zero Verification:** Standard AI chatbots have no execution environment; they cannot execute test suites, verify multi-tenant isolation, or measure regression risk.
3. **Cognitive Atrophy:** Copy-pasting AI-generated patches teaches the developer nothing, guaranteeing that identical architectural flaws will be reintroduced.

**ProofForge AI is the antidote.** It replaces passive code generation with an active, closed-loop **Learn-to-Fix Verification Pipeline**:
$$\mathbf{Audit} \longrightarrow \mathbf{Reproduce} \longrightarrow \mathbf{Socratic\ Mentor} \longrightarrow \mathbf{Guided\ Repair} \longrightarrow \mathbf{Container\ Verification} \longrightarrow \mathbf{Blind\ Transfer\ Lab} \longrightarrow \mathbf{Evidence\ Analytics}$$

---

## 🏗️ System Architecture

```
                       +---------------------------------------+
                       |         Frontend (React/Vite)         |
                       |   Tailwind CSS / Lucide / Monaco-lite |
                       +-------------------+-------------------+
                                           | REST / JWT (HS256)
                                           v
                       +---------------------------------------+
                       |       FastAPI Backend Application     |
                       |  Security Headers / Canonical Intake  |
                       +---+---------------+---------------+---+
                           |               |               |
                           v               v               v
                  +----------------+ +------------+ +---------------+
                  | Neon Postgres  | | Google AI  | | Hardened      |
                  | Serverless DB  | | Gemini API | | Docker Engine |
                  +----------------+ +------------+ +-------+-------+
                                                            |
                                        +-------------------+-------------------+
                                        |                                       |
                                        v                                       v
                             +----------------------+               +----------------------+
                             | Student Workspace    |               | Trusted Grader Suite |
                             | (/student_workspace) |               | (/grader_suite:ro)   |
                             | Mount: READ-ONLY     |               | HMAC Nonce Sealed    |
                             +----------------------+               +----------------------+
```

---

## 🔬 Key Innovations & Security Architecture

### 1. Cryptographically Sealed Blind Grader (`test_grader_security.py` -> 7/7 Passed)
- **Dual Volume Isolation:** The student's workspace is mounted read-only at `/student_workspace:ro`, while authoritative grading scripts reside at `/grader_suite:ro`. Student code cannot traverse, inspect, or modify the test suite.
- **HMAC Nonce Signatures:** An ephemeral 48-character cryptographic token (`secrets.token_hex(24)`) is generated per grading run. The grader wraps its authoritative JSON payload in signed boundaries (`<<<PROOFFORGE_GRADER_TOKEN_START:{token}>>>`). Any forged output printed by student code to stdout is rejected.
- **Process Trapping:** Student stdout/stderr streams are intercepted, and `SystemExit` exceptions during module import are caught and graded as failures.

### 2. Hardened Docker Sandbox Isolation
- **Defense-in-Depth Containment:** Every untrusted workload executes under strict boundaries:
  - `--network none` (zero network/exfiltration capability)
  - `--read-only` root filesystem with ephemeral memory-backed `--tmpfs /tmp`
  - `--user 1000:1000` (non-root execution)
  - `--security-opt no-new-privileges` & `--cap-drop ALL`
  - `--memory 512m`, `--cpus 1.0`, `--pids-limit 64`, and execution timeouts.
- **Fail-Closed Execution Gate:** If the Docker daemon is unreachable, execution immediately halts with `SECURITY_BLOCKED`. Untrusted code is **never** executed on the host.

### 3. Anti-Shortcut Automated Verification Harness
- Evaluates student patches against positive access, unauthorized access, second-tenant access, reverse tenancy isolation, and regression prevention.
- Detects and rejects shortcut anti-patterns:
  - **Universal Denial (`return 403` everywhere):** Flagged as `REGRESSION_DETECTED`.
  - **Single-Case Hardcoding (`if id == 101`):** Flagged as `INCOMPLETE`.

### 4. Socratic AI Mentor & Prompt Injection Defense
- 4 progressive disclosure tiers: Conceptual Root Cause $\rightarrow$ Architectural Strategy $\rightarrow$ Concrete Implementation $\rightarrow$ Canonical Code Pattern.
- Requesting any hint permanently unsets the `is_unassisted` flag, certifying only genuinely unassisted solves in analytics.
- Untrusted code comments are enclosed in `<source_code_under_analysis untrusted="true">` with negative constraints, neutralizing prompt injection attempts.

### 5. Evidence-Proportionate Learning Analytics
- Eliminates exaggerated marketing claims ("100% Resilient").
- Displays explicit counts and denominators (`1 of 1 challenges passed`, `1 of 1 repairs verified`).
- Includes a transparent evaluation disclaimer banner stating that statuses reflect product-defined heuristics measuring code behavior on unit/integration tests.

---

## 📊 Ground-Truth Security Benchmark Evaluation

ProofForge AI was evaluated against an empirical 10-file labeled benchmark dataset (`backend/fixtures/benchmark_dataset/`):

```
=== SECURITY SCANNER BENCHMARK METRICS ===
Total Labeled Cases: 10
True Positives (TP): 5 (Vulnerable cases correctly detected)
True Negatives (TN): 5 (Remediated cases correctly passed)
False Positives (FP): 0 (False alarms on safe code)
False Negatives (FN): 0 (Missed vulnerabilities)
Empirical Precision: 100.0%
Empirical Recall:    100.0%
Empirical Accuracy:  100.0%
===========================================
```

| Benchmark File | Category | Ground Truth | Detection Status | Classification |
|---|---|---|---|---|
| `01_idor_vulnerable.py` | Authorization (IDOR) | Vulnerable | Detected (CWE-639) | **TP (True Positive)** |
| `02_idor_safe.py` | Authorization (IDOR) | Safe / Patched | Clean (0 findings) | **TN (True Negative)** |
| `03_secret_vulnerable.py` | Credentials / Secret | Vulnerable | Detected (CWE-798) | **TP (True Positive)** |
| `04_secret_safe.py` | Credentials / Secret | Safe / Patched | Clean (0 findings) | **TN (True Negative)** |
| `05_xss_vulnerable.tsx` | Web / DOM Injection | Vulnerable | Detected (CWE-79) | **TP (True Positive)** |
| `06_xss_safe.tsx` | Web / DOM Injection | Safe / Patched | Clean (0 findings) | **TN (True Negative)** |
| `07_dependency_vulnerable.json` | Supply Chain / CVE | Vulnerable | Detected (CWE-1321) | **TP (True Positive)** |
| `08_dependency_safe.json` | Supply Chain / CVE | Safe / Patched | Clean (0 findings) | **TN (True Negative)** |
| `09_cors_vulnerable.py` | CORS Configuration | Vulnerable | Detected (CWE-942) | **TP (True Positive)** |
| `10_cors_safe.py` | CORS Configuration | Safe / Patched | Clean (0 findings) | **TN (True Negative)** |

---

## 📸 Verified Screenshot Artifacts

All screenshots captured from headless Google Chrome against live local backend and frontend instances:

| Screenshot | Description | Path |
|---|---|---|
| **01_auth_page.png** | Authentication Portal with Registration/Login | `docs/screenshots/01_auth_page.png` |
| **02_dashboard_after_auth.png** | Engineering Dashboard with Neon DB telemetry | `docs/screenshots/02_dashboard_after_auth.png` |
| **03_import_page.png** | Repository Import with Security Guardrails | `docs/screenshots/03_import_page.png` |
| **04_project_overview.png** | Project Architecture Overview & Stack Detection | `docs/screenshots/04_project_overview.png` |
| **05_codebase_explorer_initial.png** | Interactive Codebase Tree & Source Viewer | `docs/screenshots/05_codebase_explorer_initial.png` |
| **06_grounded_ai_explanation.png** | Grounded Gemini Explanations with Line Citations | `docs/screenshots/06_grounded_ai_explanation.png` |
| **07_after_logout.png** | Clean Session Termination & JWT Invalidation | `docs/screenshots/07_after_logout.png` |
| **08_security_audit_fleet.png** | Multi-Scanner Fleet Audit (Semgrep, Gitleaks, etc.) | `docs/screenshots/08_security_audit_fleet.png` |
| **09_reproduced_defect_evidence.png** | Sandboxed Defect Reproduction in Docker Container | `docs/screenshots/09_reproduced_defect_evidence.png` |
| **10_ai_mentor_vulnerability_guide.png** | Grounded AI Vulnerability Guide & Threat Model | `docs/screenshots/10_ai_mentor_vulnerability_guide.png` |
| **11_progressive_socratic_hints.png** | 4-Stage Progressive Socratic Hints | `docs/screenshots/11_progressive_socratic_hints.png` |
| **12_guided_repair_editor.png** | Guided Repair Studio with Real-time Diff | `docs/screenshots/12_guided_repair_editor.png` |
| **13_automated_verification_fixed.png** | Automated Container Repair Verification (`VERIFIED_FIXED`) | `docs/screenshots/13_automated_verification_fixed.png` |
| **14_skill_transfer_graded.png** | Blind Skill Transfer Lab with Hidden Test Grader | `docs/screenshots/14_skill_transfer_graded.png` |
| **15_learning_analytics_mastery.png** | Evidence-Proportionate Analytics Dashboard | `docs/screenshots/15_learning_analytics_mastery.png` |

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Nginx
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn
- **Database:** Neon Serverless PostgreSQL (`neondb`, production branch)
- **AI Engine:** Google Gemini API (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash`)
- **Execution & Sandboxing:** Docker Engine with WSL 2, dual read-only volume mounts, HMAC nonce signing
- **Security Tools:** Semgrep, Gitleaks, OSV-Scanner, ESLint, TypeScript Compiler, Built-in AST Scanner

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js v20+ and npm
- Python 3.12+
- Docker Desktop with WSL 2

### 2. Local Backend Setup
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Local Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access ProofForge AI.

### 4. Production Deployment via Docker Compose
```bash
cp .env.production.example .env.production
# Populate real credentials in .env.production
docker compose -f docker-compose.prod.yml up --build -d
```

---

## 🧪 Automated Verification Suite

Run all 58 automated tests:
```bash
cd backend
pytest -v
```

Run the Security Benchmark Suite:
```bash
cd backend
pytest tests/test_benchmark_metrics.py -s -v
```

Run the Adversarial Grader Security Suite:
```bash
cd backend
pytest tests/test_grader_security.py -s -v
```

Verify Frontend Build:
```bash
cd frontend
npm run build
```

---

## 📖 Key Documentation Links

- [System Architecture & ADRs](docs/ARCHITECTURE.md) (ADRs 001 through 012)
- [Comparative Evaluation Study](docs/EVALUATION_STUDY.md) (Protocol comparing AI patch generation vs ProofForge AI)
- [Hackathon Presentation & Judge Defense](docs/HACKATHON_DEMO.md) (90s pitch, 3m demo, 16 judge defense answers)
- [Verification Test Report](docs/TEST_REPORT.md) (Full test outcomes and verification logs)
- [Architectural Decisions](docs/DECISIONS.md) (Complete decision log)
- [Project Progress History](docs/PROGRESS.md) (Phases 1 through 12 breakdown)

---

## 👥 Credits & Authors

- **Praveensagar07** — Systems Architecture, Full-Stack Development, Security Engineering, AI Systems Design
- **ProofForge AI Team** — Dedicated to bridging the gap from vibe coding to real engineering.
