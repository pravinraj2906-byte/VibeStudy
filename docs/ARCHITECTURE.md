# ProofForge AI Architecture

## Overview
ProofForge AI is an AI Engineering Coach designed to bridge the gap between AI-assisted coding and solid software engineering practices ("From Vibe Coding to Real Engineering").

---

## Technology Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Headless Chrome automation
- **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic
- **Database:** Neon Serverless PostgreSQL (Database: `neondb`, Branch: `production`, Pool pre-ping enabled)
- **AI Provider:** Google Gemini API (`gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash`) backend-only integration
- **Security Scanners:** Semgrep, Gitleaks, OSV-Scanner, ESLint, TypeScript compiler (tsc), Built-in AST analyzer
- **Sandbox Execution:** Ephemeral Docker containers (`--memory=512m`, `--cpus=1.0`, `--network=none`, `--rm`) with isolated subprocess fallback
- **Testing:** pytest (50 passing tests), Puppeteer browser automation

---

## Security Intelligence Architecture (Milestone B)

```mermaid
flowchart TD
    Repo[Imported Repository Source] --> Pipeline[Security Audit Engine]
    
    subgraph ScannerFleet["Integrated Multi-Scanner Fleet"]
        S1["Semgrep CLI<br/>(Pattern Rules)"]
        S2["Gitleaks CLI<br/>(Secret Leaks)"]
        S3["OSV-Scanner CLI<br/>(CVE Advisories)"]
        S4["ESLint CLI<br/>(Lint & AST)"]
        S5["TypeScript CLI<br/>(Static Diagnostics)"]
        S6["Built-in AST Scanner<br/>(High-Precision Fallback)"]
    end

    Pipeline --> S1 & S2 & S3 & S4 & S5 & S6
    S1 & S2 & S3 & S4 & S5 & S6 --> Normalizer[Unified Finding Normalizer]

    Normalizer --> Redactor[Secret Masking & Redaction]
    Redactor --> DB[(Neon PostgreSQL<br/>findings & scan_jobs)]

    DB --> UI[Frontend Security Dashboard]
    DB --> Mentor[AI Engineering Mentor<br/>Gemini Service]
    DB --> Repro[Controlled Defect<br/>Reproduction Runner]

    Repro --> DockerWorker["Ephemeral Docker Sandbox<br/>(No Network, 512MB RAM, 30s Timeout)"]
    Repro --> SubprocWorker["Isolated Subprocess Runner<br/>(Clean Temp Dir, Sanitized Env)"]
```

### 1. Multi-Scanner Fleet & Normalized Schema
Every scanner adheres to an abstract `BaseScanner` interface:
- `is_available()`: Detects whether the CLI binary exists in the host environment.
- `get_version()`: Retrieves the tool version.
- `scan(repo_path)`: Returns a standardized `ScannerResult` with normalized `RawFinding` records.
- Graceful degradation: If an external CLI (e.g., Semgrep or Gitleaks) is not installed in the host environment, its status is recorded as `scanner_unavailable` without failing the scan job.
- Built-in AST Scanner: Inspects Python AST, React JSX components, configuration constants, and manifests for IDOR patterns, XSS injection, hardcoded credentials, and dependency CVEs.

### 2. Unified Finding Schema
All findings are persisted to the Neon PostgreSQL `findings` table:
- `title`, `description`, `severity` (`critical`, `high`, `medium`, `low`, `info`)
- `category` (`security`, `architecture`, `code_quality`, `performance`)
- `file_path`, `line_number`, `line_end`
- `scanner_name`, `scanner_version`, `scanner_rule_id`
- `confidence` (`high`, `medium`, `low`)
- `code_snippet` (strictly sanitized/redacted)
- `risk_explanation`, `remediation`
- `verification_status` (`static_finding`, `reproduction_verified`, `not_reproducible`, `inconclusive`, `unsupported`, `scanner_unavailable`)
- `reproduction_data` (JSON evidence log, execution command, exit code, runner type, timestamps)

---

## AI Engineering Mentor & Socratic Hint Deck (Phase 6)

### 1. Guardrails & Prompt Injection Defense
- Untrusted user source code is strictly isolated inside `<source_code_under_analysis untrusted="true">` XML tags.
- System instructions instruct the Gemini model to ignore commands, overrides, or system instructions embedded in user comments or string constants.
- Secrets are passed through `CodebaseAnalyzer.mask_secrets` prior to prompt assembly.

### 2. Line Citation Verification
- When explaining a finding, the backend opens the target file on disk, validates line count, and verifies that `line_number` and `line_end` fall within bounds.
- Returns `citations_verified: true` to the frontend.

### 3. Progressive 4-Level Hint Engine
To teach developers how to fix vulnerabilities without dumping blind copy-paste solutions:
- **Level 1 (Conceptual Principle):** Explains the underlying security vulnerability class. Strictly forbidden from mentioning file paths, line numbers, or function names.
- **Level 2 (Investigation Direction):** Suggests the architectural subsystem, state lifecycle, or data transition to inspect.
- **Level 3 (Vulnerable Location & Root Cause):** Names the exact file, component, and construct, explaining why the condition fails.
- **Level 4 (Concrete Repair Strategy & Verification):** Details the secure architectural pattern to implement, edge cases to handle, and the regression test to verify resolution.

---

## Controlled Defect Reproduction Engine & Security Isolation (Phase 7)

```mermaid
sequenceDiagram
    actor Developer
    participant UI as ProofForge Frontend
    participant Coord as Reproduction Coordinator
    participant Runner as Sandboxed Runner
    participant Box as Ephemeral Sandbox (Docker / Isolated Subproc)
    participant DB as Neon Database

    alt Benchmark Fixture Reproduction (Vetted Educational Harness)
        Developer->>UI: Click "Run Benchmark"
        UI->>Coord: POST /api/v1/findings/{id}/reproduce?target_mode=fixture
        Coord->>Coord: Match finding to Synthetic Fixture Recipe (backend/fixtures)
        Coord->>Runner: execute_reproduction(is_untrusted_code=False)
        alt Docker Daemon Operational
            Runner->>Box: docker run --rm --network none -m 512m --cpus 1.0 --read-only --user 1000:1000 ...
        else Host Subprocess Fallback (Vetted Fixtures Only)
            Runner->>Box: Ephemeral temp directory with sanitized env (stripped cloud/DB secrets)
        end
        Box-->>Runner: Capture exit_code, stdout, stderr, assertions
        Runner-->>Coord: ExecutionResult (target_type: synthetic_fixture)
        Coord->>DB: Persist verification_status & reproduction_data
        Coord-->>UI: ReproductionResultOut
        UI-->>Developer: Render green verification badge & terminal evidence
    else Untrusted Repository Code Reproduction
        Developer->>UI: Click "Test Repo Code"
        UI->>Coord: POST /api/v1/findings/{id}/reproduce?target_mode=repository
        Coord->>Runner: execute_reproduction(is_untrusted_code=True)
        alt Docker Daemon Stopped / Unavailable
            Runner-->>Coord: Blocked by Policy (exit_code: -1, runner_type: none)
            Coord-->>UI: Return "unsupported" (Host fallback disabled for untrusted code)
            UI-->>Developer: Render Security Policy Warning (Docker isolation required)
        else Docker Daemon Operational
            Runner->>Box: docker run --rm --network none -m 512m --cpus 1.0 --read-only --user 1000:1000 ...
            Box-->>Runner: ExecutionResult
            Coord-->>UI: ReproductionResultOut
        end
    end
```

### 1. Strict Security Boundary & Untrusted Code Isolation
To protect the host operating system and cloud environment credentials:
- **Host Subprocess Execution Policy:** Subprocess execution on the host machine is strictly disabled for all imported or otherwise untrusted repository code.
- **Docker Containment:** Direct execution of custom repository exploits requires an active Docker container with strict hardening parameters:
  - `--rm`: Ephemeral container lifecycle; automatically removed on completion.
  - `--network none`: Strict network isolation; container cannot access localhost, internal networks, or external internet.
  - `--memory 512m` & `--cpus 1.0`: Strict resource bounding preventing CPU or memory exhaustion attacks.
  - `--user 1000:1000`: Non-root execution preventing privilege escalation.
  - `--security-opt no-new-privileges` & `--cap-drop ALL`: Linux kernel security hardening dropping all administrative capabilities.
  - `--read-only`: Read-only root filesystem preventing modifications to system libraries or binaries.
  - `--tmpfs /tmp:rw,noexec,nosuid,size=64m`: Minimal ephemeral in-memory temp mount for temporary files.
  - `-v <path>:/app:ro`: Read-only host workspace mount ensuring untrusted code cannot alter workspace files.
  - Bounded Execution Timeout: Hard cap of 30 seconds (`timeout=min(timeout, 30)`).
- **Vetted Synthetic Benchmark Fixtures:** Only developer-vetted internal test harnesses located inside `backend/fixtures/` are permitted to execute in isolated subprocesses when Docker is inactive. The runner actively validates that the canonical target path starts with the trusted `FIXTURES_ROOT`; any path outside this root is immediately downgraded to untrusted execution policy and blocked on the host.

### 2. Synthetic Vulnerability Fixtures (`backend/fixtures/`):
1. **Fixture A — Broken Object-Level Authorization (IDOR, CWE-639):**
   - FastAPI endpoint `/invoices/{invoice_id}` accepting user credentials but omitting tenant ownership validation.
   - Reproduction test demonstrates `user_bob` accessing `user_alice` confidential invoice with HTTP 200 OK.
2. **Fixture B — Unsafe Rendering / DOM Injection (XSS, CWE-79):**
   - Directly renders unescaped `<script>` and `<img>` injection payloads into DOM.
   - Reproduction test demonstrates raw unescaped payload in rendered output.
3. **Fixture C — Exposed Cloud Secret (CWE-798):**
   - Client-accessible configuration containing `AKIAIOSFODNN7EXAMPLE`.
   - Reproduction test demonstrates regex extraction of active AWS access key.
4. **Fixture D — Dependency Advisory (CWE-1321, CVE-2021-23337):**
   - Manifest referencing vulnerable `lodash@4.17.20`.
   - Reproduction test validates dependency constraint against published prototype pollution advisory.

---

## Milestone C: Learn-to-Fix Verification Architecture (Phases 8–10)

The defining innovation of ProofForge AI is the closed-loop **Learn-to-Fix Verification** workflow:
```
Teach (Socratic Hints) -> Repair (Studio Editor) -> Verify (Automated Container) -> Transfer (Blind Lab) -> Assess (Analytics Matrix)
```

```mermaid
flowchart TD
    Finding[Security Finding / Defect] --> Session[Repair Session Created]
    
    subgraph Phase8["Phase 8: Guided Repair Studio"]
        Session --> WSMgr["WorkspaceManager<br/>(backend/storage/workspaces/repair_id)"]
        WSMgr --> ImmutTemplate["Immutable Template Copy<br/>(template/app.py)"]
        WSMgr --> EditableFile["Practice Workspace<br/>(app.py)"]
        EditableFile --> DiffCalc["Dynamic Unified Diff Engine"]
        DiffCalc --> StudioUI["Interactive Repair Studio UI<br/>(Line Numbers, Syntax, Diff Preview)"]
        StudioUI --> SocraticDeck["4-Tier Socratic Hint Deck & AI Coach"]
    end

    subgraph Phase9["Phase 9: Automated Verification Pipeline"]
        StudioUI --> ASTCheck["Pre-Execution AST Syntax Parser"]
        ASTCheck --> DockerGate{"Fail-Closed Container Gate<br/>(Docker Available?)"}
        DockerGate -- No --> BlockPolicy["Status: SECURITY_BLOCKED<br/>(Host Subprocess Execution Forbidden)"]
        DockerGate -- Yes --> HardenedContainer["Hardened Docker Sandbox<br/>(proofforge-sandbox:latest)<br/>--network=none, --memory=512m, --user=1000:1000<br/>--read-only, --tmpfs /tmp, --cap-drop ALL"]
        HardenedContainer --> Harness["Anti-Shortcut Verification Suite<br/>1. Positive Access (Alice -> 101)<br/>2. Negative Cross-Tenant (Bob -> 101)<br/>3. Regression Access (Bob -> 102)<br/>4. Generalization Check"]
        Harness --> Outcome{"Authoritative Outcome"}
        Outcome -- All Passed --> VFixed["VERIFIED_FIXED"]
        Outcome -- Universal Deny 403 --> RegrDet["REGRESSION_DETECTED"]
        Outcome -- ID 101 Only --> Incomp["INCOMPLETE"]
        Outcome -- Syntax Error --> ExecFail["EXECUTION_FAILED"]
    end

    subgraph Phase10["Phase 10: Skill Transfer Lab & Analytics"]
        VFixed --> TransferLab["Independent Skill Transfer Lab<br/>(/projects/:id/transfer-lab)"]
        TransferLab --> ChallengeBank["Versioned Challenge Bank<br/>(transfer-task-auth-v1)"]
        ChallengeBank --> BlindSandbox["Blind Student Sandbox<br/>(Student only sees task_api.py)"]
        BlindSandbox --> HiddenGrader["Authoritative Hidden Grader in Docker<br/>(grader.py outside student workspace)"]
        HiddenGrader --> Certify{"6/6 Tests Passed?"}
        Certify -- Yes & No Hints --> UnassistedPill["Certified: UNASSISTED TRACK"]
        Certify -- Yes & Hints Used --> AssistedPill["Certified: ASSISTED (PRACTICED)"]
        UnassistedPill & AssistedPill --> Analytics["Learning Analytics Dashboard<br/>(Competency Verification Matrix: MASTERED)"]
    end
```

### 1. Phase 8: Guided Repair Studio Architecture
- **Per-Session Workspace Isolation:** Each practice attempt creates an isolated directory `backend/storage/workspaces/repair_{id}`.
- **Directory Traversal Protection:** All file paths are resolved with `os.path.realpath` and checked against the session's workspace root. Any path containing `..` or leading outside the root triggers `WorkspaceSecurityError`.
- **Immutable Template Preservation:** An untouched copy of the starter code is stored in `template/`. Resetting restores this template without requiring database re-seeding.
- **Unified Diff Generation:** Diffs are computed using Python `difflib.unified_diff` with standard Git-style headers (`--- a/... +++ b/...`).
- **Socratic Hints Deck:** Four progressive disclosure tiers:
  1. *Level 1 (Conceptual Root Cause):* Security principle explanation.
  2. *Level 2 (Architectural Strategy):* High-level remediation pattern.
  3. *Level 3 (Concrete Implementation):* Variable names and method calls.
  4. *Level 4 (Canonical Code Pattern):* Reference patch code.

### 2. Phase 9: Automated Verification Pipeline Architecture
- **Fail-Closed Execution Gate:** Untrusted student code is never allowed to execute directly on the host machine. If Docker daemon is stopped, execution immediately fails-closed with `SECURITY_BLOCKED`.
- **Hardened Execution Parameters:**
  - `docker run --rm --network none --memory 512m --cpus 1.0 --user 1000:1000 --security-opt no-new-privileges --cap-drop ALL --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m -v <workspace>:/app:ro proofforge-sandbox:latest python test_reproduction.py`
- **Anti-Shortcut Verification Harness:**
  - *Authorized Access Test:* Legitimate user accesses their own resource -> must return HTTP 200.
  - *Cross-Tenant Access Test:* Unauthorized user accesses other tenant's resource -> must return HTTP 403.
  - *Regression Access Test:* Second tenant accesses their own resource -> catches universal-deny patches (`REGRESSION_DETECTED`).
  - *Reverse Cross-Tenant Test:* Catches hardcoding specific object IDs (`INCOMPLETE`).

### 3. Phase 10: Independent Skill Transfer Lab & Analytics Architecture
- **Blind Student Sandbox:** In transfer challenges, the evaluation suite (`grader.py`) is located strictly outside the student workspace. The student cannot inspect, modify, or mock out test assertions.
- **Versioned Challenge Bank:** Challenge definitions are stored with declarative metadata (`domain`, `concept`, `difficulty`, `scenario`, `starter_files_dir`, `editable_file`, `hidden_test_script`).
- **Unassisted Track Certification:** Attempts track whether hints were requested (`hints_used`). An attempt completed without hints earns the `is_unassisted: true` certification flag.
- **Evidence-Based Learning Analytics:** The analytics engine compiles verified repairs and graded transfer challenges into a unified Competency Verification Matrix with definitive, evidence-proportionate status (`TRANSFER_DEMONSTRATED (UNASSISTED)`, `PRACTICE_STARTED`, `NOT_STARTED`).

---

### ADR 011: Blind Grader Isolation via Dual Read-Only Mounts and Ephemeral Cryptographic Nonces

- **Status:** Accepted (Milestone D Hardening)
- **Context:** In educational coding platforms, learners can potentially bypass grading by inspecting the local directory for test fixtures, reading grader source code (`open('grader.py').read()`), spoofing stdout JSON outputs (`print('{"passed_all": true}')`), or calling `sys.exit(0)` to prematurely terminate the test runner.
- **Decision:**
  1. **Volume Separation:** Student workspace is mounted strictly at `/student_workspace:ro` and grader files are located at `/grader_suite:ro`. Student code cannot navigate or read outside `/student_workspace`.
  2. **Workspace Sanitization:** When provisioning a challenge attempt, any file starting with `grader` or `test_` is strictly excluded from the student directory.
  3. **Cryptographic Nonce Signing:** An ephemeral 48-character cryptographic token (`secrets.token_hex(24)`) is generated per grading run and passed to the container runner. The trusted grader wraps its JSON payload in signed boundaries:
     `<<<PROOFFORGE_GRADER_TOKEN_START:{token}>>>{"passed_all": true, ...}<<<PROOFFORGE_GRADER_TOKEN_END:{token}>>>`.
     The host runner validates the presence and exact match of this nonce. Any spoofed output printed by student code to `stdout` is rejected.
  4. **Execution Containment:** The grader redirects student standard I/O and traps `SystemExit` on module import.
- **Consequences:** Student code cannot cheat, extract test criteria, or forge grading results. Verified by 7 dedicated adversarial security tests (`test_grader_security.py`).

---

### ADR 012: Evidence-Proportionate Learning Analytics & Explicit Heuristic Evaluation

- **Status:** Accepted (Milestone D Validation)
- **Context:** Educational platforms frequently present exaggerated mastery claims (e.g., "100% Secure Architecture", "Certified Resilient") based on single puzzle solves. This induces dangerous overconfidence in application security engineering.
- **Decision:**
  1. **Explicit Denominators:** All KPI summary cards and competency indicators must show explicit counts (e.g. `1 of 1 challenges passed`, `1 of 1 repairs verified`) rather than bare percentages.
  2. **Heuristic Disclaimer Banner:** Every analytics view displays an explicit disclaimer: *"Readiness and transfer statuses are heuristic engineering indicators measuring passing unit/integration test results across practical code scenarios. They reflect demonstrated code behavior rather than standardized psychometric or academic certifications."*
  3. **Multi-Tier Readiness Framework:** Status scales proportionately with demonstrated evidence:
     - `EVALUATION_PENDING`: Zero challenges completed.
     - `INITIAL_TRANSFER_DEMONSTRATED`: 1 challenge completed unassisted (single scenario initial proof).
     - `PRACTICED_MULTI_SCENARIO`: Multiple challenges completed across one domain.
     - `MULTI_DOMAIN_RESILIENT`: Challenges completed across diverse architectural patterns.
- **Consequences:** Transparent, defensible, and academically honest reporting of developer skill progression.
