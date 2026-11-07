# ProofForge AI

**Evidence-first engineering for AI-built software.**

ProofForge maps a repository, teaches the developer how it works, and verifies security repairs with deterministic evidence. The AI mentor explains. The evidence pipeline proves.

## Public deployment

**Open the live prototype:** https://pravinraj2906-byte.github.io/VibeStudy/

The deployment is publicly accessible and requires no account. Select **Open judge prototype** on the landing page to enter the complete guided demo.

**Hackathon:** INFINEX 2K26  
**Repository:** https://github.com/pravinraj2906-byte/VibeStudy

This repository contains the complete frontend, backend, database migrations, educational fixtures, tests, and project documentation. Private credentials, installed dependencies, generated builds, and user workspaces are intentionally excluded.

## Why this version is different

The hackathon edition preserves the original repository explorer, security audit, guided repair, skill-transfer lab, analytics, and interactive Three.js views, then adds an explainable learning layer:

- A friendly project-wide AI mentor that teaches architecture, data flow, AI choices, security, testing, and sensible next steps.
- Personal mentor memory stored per authenticated user and project, with a browser fallback when the API is temporarily unavailable.
- User-controlled learning goals and guided, concise, or deep-dive teaching modes.
- A transparent 100-point repository-evidence review covering architecture visibility, security posture, delivery readiness, and explainability.
- Responsive workflow and system-layer diagrams that explain how source code becomes verified learning evidence.
- Clear claim boundaries: readiness scores show their evidence and never replace a final security audit or production review.

## Verified prototype result

The built-in AST and heuristic scanner was rerun against ten labeled fixtures covering IDOR, secrets, XSS, vulnerable dependencies, and unsafe CORS.

| Measure | Result | Scope |
|---|---:|---|
| Precision | 100% | 5 true positives, 0 false positives |
| Recall | 100% | 5 of 5 vulnerable fixtures detected |
| Accuracy | 100% | 10 of 10 labeled fixtures classified correctly |

These numbers measure the included scanner benchmark only. They do not measure Gemini response accuracy or production-wide security coverage. Run the benchmark with `python -m pytest tests/test_benchmark_metrics.py -q` from `backend/`.

## Model and evidence boundary

- Gemini provides source-grounded explanations, guided questions, and suggested next steps.
- Static analysis and tests produce the verification evidence shown to the user.
- The repository evidence score is an explainable heuristic, not a machine-learning confidence score.
- If the AI provider is unavailable, repository analysis and saved learning memory remain usable; the interface labels AI-dependent guidance as unavailable.

Apply `a7b8c9d0e1f2_add_personal_mentor_memory.py` through the normal `alembic upgrade head` command before using account-synced mentor memory.

## What is included

- React and TypeScript frontend with a light interface, illustrations, transitions, and optional interactive 3D architecture views.
- FastAPI backend with email/password sessions, user-scoped projects, repository import, static analysis, and learning workflows.
- PostgreSQL models and Alembic migrations, including Firebase identity fields.
- Firebase/Google authentication integration code and setup documentation.
- Reproduction, repair-verification, and challenge-grading implementation, with execution disabled in the hosted web service.
- Docker production files and environment-variable templates.

## Repository structure

```text
VibeStudy/
|-- frontend/
|   |-- src/              # Pages, components, API client, authentication
|   |-- public/           # Illustrations and static assets
|   |-- package.json
|   |-- package-lock.json
|   |-- .env.example
|   |-- vercel.json       # SPA route fallback
|   `-- Dockerfile
|-- backend/
|   |-- app/              # API routes, models, services, configuration
|   |-- alembic/          # Versioned database migrations
|   |-- fixtures/         # Educational and scanner test repositories
|   |-- tests/
|   |-- requirements.txt
|   |-- .env.example
|   `-- Dockerfile
|-- docs/                 # Architecture, API, Firebase, demo and test notes
|-- .env.production.example
|-- docker-compose.prod.yml
`-- .gitignore
```

## Run locally

Use Python 3.12 and Node.js 20, matching the Docker build configuration, plus a PostgreSQL database.

### 1. Clone the repository

```powershell
git clone https://github.com/pravinraj2906-byte/VibeStudy.git
cd VibeStudy
```

### 2. Configure and start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` locally. Supply a PostgreSQL `DATABASE_URL`, your `GEMINI_API_KEY`, and a random `SECRET_KEY`. For example, generate the signing secret with:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Keep `APP_ENV=development` for local development and `CODE_EXECUTION_ENABLED=false`. The default CORS list permits the local Vite origin. If overriding it, use a JSON array, for example `CORS_ORIGINS=["http://localhost:5173"]`.

Apply migrations to your intended database and start the API:

```powershell
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Local API documentation: <http://127.0.0.1:8000/docs>.

### 3. Start the frontend in another terminal

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Open the local URL printed by Vite. Its API proxy forwards `/api` requests to the local backend. Leave `VITE_API_BASE_URL` blank for that setup. For separate hosts, set it to the actual backend HTTPS origin before building.

### 4. Build or test

```powershell
# From frontend/
npm run build

# From backend/, with the virtual environment and test configuration ready
python -m pytest
```

Backend tests have their own configuration and fixtures; review them before running against any database. Historical test reports in `docs/` are not a claim that this checkout has just passed every test.

## Authentication

Email/password authentication works independently of Firebase. To enable Google sign-in, configure the intended Firebase web app, enable the Google provider, add the deployed frontend to authorized domains, and configure matching backend Firebase verification settings. Follow [the Firebase setup guide](docs/FIREBASE_SETUP_GUIDE.md).

Only Firebase web-app configuration belongs in `VITE_FIREBASE_*`. Never put Firebase Admin private keys, database credentials, JWT signing secrets, or Gemini API keys in frontend variables.

## Hosted deployment and limits

The public judge demo is deployed through GitHub Pages from the tested `frontend/` build. The complete authenticated product also supports a FastAPI service with PostgreSQL when the backend environment is configured.

- **Code execution is disabled.** Reproduction, repair verification, and challenge grading require a separately isolated worker. The public API returns 503 for these execution actions, and the UI disables their controls.
- **Google sign-in is not configured in the demo.** Use email/password.
- **AI provider responses have not been verified.** The UI does not claim AI readiness.
- The dependency audit found unresolved advisory entries. Review and remediate them before treating this as a production-ready service.

For production, use `APP_ENV=production`, a unique strong `SECRET_KEY`, and `CORS_ORIGINS` as a JSON array containing exact HTTPS frontend origins. Keep `CODE_EXECUTION_ENABLED=false`. Store secrets in host environment settings. Never mount the host Docker socket into the public service. Review `.env.production.example` and `docker-compose.prod.yml` before using them.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Firebase setup](docs/FIREBASE_SETUP_GUIDE.md)
- [Design decisions](docs/DECISIONS.md)
- [Demo walkthrough](docs/HACKATHON_DEMO.md)
- [Historical test report](docs/TEST_REPORT.md)
- [Historical project overview](docs/PROJECT_OVERVIEW.md)

## Secrets and educational fixtures

Copy only example environment files. Real `.env` files and common credential-file names are ignored by Git. Review staged changes before pushing. Fixtures intentionally contain vulnerable code and synthetic secret examples for scanner testing; never run untrusted repository code in the web process.

## AI model, evaluation, monitoring, and code-teaching methodology

### What the AI model does (and does not do)

ProofForge uses **Google Gemini** as a source-grounded teaching assistant, not as a security verdict engine. Its role is to help learners understand their own application's architecture, code paths, dependencies, design choices, and potential fixes. The repository does **not** establish a measured Gemini accuracy rate, a custom-trained model, or a model-specific benchmark score. Model name/version and runtime configuration depend on the deployed environment; do not infer them from the scanner metrics below.

The product separates three kinds of output:

| Output | Source | Interpretation |
|---|---|---|
| Repository structure, source excerpts, and dependency information | Imported project and analysis pipeline | Inspectable repository facts, subject to parser/import limitations |
| Explanations, guided questions, and repair suggestions | Gemini with repository context | Educational guidance; may be incomplete or incorrect and must be checked |
| Static-analysis findings, test outcomes, and evidence score | Deterministic scanners, tests, and documented heuristics | Reproducible signals within their stated scope; not proof of complete security |

The **Repository Evidence Score** is a transparent 100-point heuristic covering architecture visibility, security posture, delivery readiness, and explainability. Its deductions should be inspected individually; it is neither model confidence nor a guarantee of production readiness.

### How learners understand the real code behind their app

The intended learning loop is **Explore → Explain → Repair → Verify → Transfer**:

1. **Explore:** Import a repository and inspect the actual directory structure, files, dependency relationships, and available architecture/data-flow views. Start from real source code, not a generic explanation.
2. **Explain:** Ask the mentor why a function, API route, database model, authentication boundary, or dependency exists. Relate explanations to the imported project and inspect the corresponding source; distinguish observed facts from interpretation.
3. **Repair:** Review a specific scanner finding and its affected code. Use progressive hints to reason about root cause, trust boundaries, and minimal changes before writing a patch.
4. **Verify:** Compare the proposed change against deterministic scanner output and tests where execution infrastructure is available. A suggested fix alone is not a verified fix.
5. **Transfer:** Attempt a fresh, related challenge and explain the reasoning without simply copying the mentor's answer. This checks whether knowledge can be applied beyond the original example.

The mentor can use a learner's project-scoped goals and prior concepts to adapt its teaching style (guided, concise, or deep-dive). Account-synced memory requires the configured backend and database; browser fallback is temporary when the API is unavailable.

### What accuracy is actually measured

The currently documented benchmark evaluates the **built-in AST and heuristic security scanner**, **not Gemini**. It contains 10 labeled fixtures spanning IDOR, synthetic secrets, XSS, vulnerable dependencies, and unsafe CORS: **TP = 5, TN = 5, FP = 0, FN = 0**.

| Scanner metric | Calculation | Fixture result |
|---|---|---|
| Precision | TP / (TP + FP) | 5 / 5 = **100%** |
| Recall | TP / (TP + FN) | 5 / 5 = **100%** |
| Accuracy | (TP + TN) / all fixtures | 10 / 10 = **100%** |
| False-positive rate | FP / (FP + TN) | 0 / 5 = **0%** |

Reproduce the documented benchmark from `backend/` with `python -m pytest tests/test_benchmark_metrics.py -q`. These fixture-level results are **not** evidence of 100% detection on unseen repositories, zero false alarms in production, or 100% AI teaching accuracy. The repository README records the historical result; rerun tests against the specific commit/environment before reporting a new measurement.

### How to evaluate AI teaching quality

The following is a **proposed evaluation protocol**, not a claim that the full evaluation has already been run:

1. Assemble a versioned test set of real or synthetic repositories with known architecture, code paths, intentional bugs, and reference explanations. Separate evaluation repositories from development examples.
2. Ask a fixed set of tasks: locate a relevant file/function, trace an API request through the stack, explain a security issue, propose a minimal repair, and teach a concept with a follow-up question.
3. Score **source grounding** (whether cited files and lines exist and support the claim), **technical correctness** (expert review against code/tests), **repair validity** (tests and scanner outcomes), **teaching clarity** (rubric-based human review), and **skill transfer** (independent follow-up task performance).
4. Record unsupported claims, hallucinated paths, unsafe advice, and failures to distinguish a suggestion from verified evidence. Report each metric with sample size, rubric, model/configuration, and test-set version.
5. Compare changes against a fixed baseline before release. Do not turn qualitative mentor feedback into an unsupported single “AI accuracy” percentage.

For code-location tasks, an example measurable indicator is **grounded-reference rate = supported file/line references ÷ all file/line references checked**. For repair tasks, report the fraction of attempted fixes passing the specified tests, with the number of attempted tasks. These are evaluation definitions, **not measured results**.

### How to monitor quality and safety

A production monitoring plan should track: model/provider availability and latency; API failures; unsupported or invalid source references; scanner finding counts and severity; test pass/fail rates; repair attempts and verification outcomes; learner feedback; and independent transfer-task results. Segment metrics by application version, model configuration, repository type, and evaluation set to detect regressions. Avoid collecting raw secrets or unnecessary personal code in telemetry; enforce per-user/project isolation and redact sensitive data in logs.

When Gemini is unavailable, repository facts and deterministic analysis should remain available and AI-dependent explanations should be labeled unavailable. When the isolated execution worker is absent, code execution and repair verification must remain disabled rather than reporting success. The **public GitHub Pages judge prototype** demonstrates the workflow but does **not** provide hosted code execution or verified live repair runs. The current README does not establish that all proposed monitoring dashboards, alerts, and AI evaluation jobs are deployed; these are planned operational controls.
