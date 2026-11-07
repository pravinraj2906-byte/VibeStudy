# Architecture Decision Records (ADRs)

## ADR 001: Workspace Initialization and Version Control Setup
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** The hackathon repository is published as `https://github.com/pravinraj2906-byte/VibeStudy` while the product remains branded ProofForge AI.
- **Decision:** Initialized git, connected origin remote, synchronized `main` tracking branch, configured comprehensive `.gitignore` preventing secrets and virtual environments from tracking.
- **Consequences:** Ensures clean version control and secret hygiene across frontend and backend.

## ADR 002: Remote Database Connection Stability with Neon PostgreSQL
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** Neon PostgreSQL is a serverless remote database with ephemeral pooling and network round-trip latency.
- **Decision:** Configured SQLAlchemy engine with `pool_pre_ping=True`, `pool_recycle=300`, and resilient connection handling. Set integration test timeouts to 60s–120s to tolerate remote latency without flaky failures.
- **Consequences:** Eliminates stale socket disconnections while preserving serverless cloud database scalability.

## ADR 003: Gemini Model Selection and Fallback Pipeline
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** Google Gemini models vary across regional deployments and deprecation schedules (`gemini-2.0-flash` returns 404 in current SDK).
- **Decision:** Configured prioritized fallback list: `gemini-3.5-flash-lite` -> `gemini-3.5-flash` -> `gemini-3.8-flash`, backed by deterministic local architectural grounding.
- **Consequences:** Provides ultra-fast responses (~1-2s) with resilient fallback should any specific model tier become temporarily unavailable.

## ADR 004: Untrusted Repository Storage & AST Isolation
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** Users import arbitrary public GitHub repositories that may contain malicious code, path traversal attacks, or symlinks.
- **Decision:** Repositories are uncompressed into `backend/storage/repos/proj_{id}_{sha}` with strict zip slip protection, symlink rejection, 50MB size caps, and analyzed strictly via static AST parsers. Untrusted code is NEVER executed on the host.
- **Consequences:** Guarantees host operating system security against malicious repository payloads.

## ADR 005: Multi-Scanner Fleet Normalization with Resilient Fallback
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** Milestone B requires integrating Semgrep, Gitleaks, OSV-Scanner, ESLint, and TypeScript compiler. In diverse developer environments (Windows/macOS/Linux), specific CLI binaries may not be installed in the host PATH.
- **Decision:** Implemented an abstract `BaseScanner` interface for each tool. If a tool binary is absent, its status is explicitly marked as `scanner_unavailable` without failing the overall audit job or faking results. Implemented a built-in high-precision AST & heuristic adapter that always runs, ensuring every imported project receives an extensive security audit.
- **Consequences:** The platform operates reliably in any host configuration without requiring dozens of external binary dependencies, while taking full advantage of external tools whenever present.

## ADR 006: Socratic Progressive Disclosure & Prompt Injection Defense
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** Developers building with AI often copy-paste code without understanding ("vibe coding"). AI explanations must not provide instant copy-paste patches, and must not be vulnerable to prompt injection attacks embedded in user source files (e.g. `// IGNORE PREVIOUS INSTRUCTIONS`).
- **Decision:** Implemented a 4-level progressive hint engine (Conceptual -> Investigation -> Location -> Repair Strategy). Enclosed all untrusted source code in `<source_code_under_analysis untrusted="true">` with strict negative constraints. Validated cited line numbers against actual file content before returning. Pre-sanitized all code snippets with `CodebaseAnalyzer.mask_secrets`.
- **Consequences:** Fosters genuine engineering skill transfer while completely neutralizing prompt injection and credential leakage vectors.

## ADR 007: Ephemeral Sandboxing & Strict Host Security Boundary for Defect Reproduction
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** Reproducing defects (e.g., verifying IDOR or XSS) requires executing test code. Executing arbitrary untrusted code directly on the host machine poses extreme risks of command execution, filesystem modification, and credential compromise.
- **Decision:** Built a hardened dual-tier execution runner with an absolute security boundary:
  1. Untrusted imported repository code can NEVER execute via host subprocess fallback. Untrusted execution strictly requires an operational Docker container (`--rm`, `--network none`, `--memory 512m`, `--cpus 1.0`, `--user 1000:1000`, `--read-only`, `--tmpfs /tmp`, `--cap-drop ALL`, `-v <path>:/app:ro`). If Docker is unavailable, untrusted execution is immediately blocked by policy (`status="unsupported"`, `runner_type="none"`).
  2. Only internal, developer-vetted educational benchmark fixtures (in `backend/fixtures/`) are permitted to execute via an ephemeral isolated subprocess runner in a clean `tempfile.TemporaryDirectory()` with stripped cloud and database credentials (`DATABASE_URL`, `GEMINI_API_KEY`, `SECRET_KEY`, `GITHUB_TOKEN`, `AWS_SECRET_ACCESS_KEY`).
  3. Paths are canonicalized and verified against `FIXTURES_ROOT` to prevent directory traversal or spoofing of fixture status.
- **Consequences:** Eliminates any risk of arbitrary host code execution while maintaining full educational defect verification capabilities.

## ADR 008: Isolated Practice Workspaces and Socratic Patch Lifecycle
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** In Milestone C (Phase 8), learners repair defects identified in their imported projects or synthetic fixtures. The learner's iterative edits must not alter the master repository or template files, must allow safe resetting, and must guard against directory traversal.
- **Decision:** Implemented `WorkspaceManager` that provisions isolated workspaces under `backend/storage/workspaces/repair_{session_id}/`. Edits are strictly canonicalized using `os.path.realpath` to forbid path traversal outside the allocated practice directory. An immutable copy of the original starter code is preserved in `template/`. Unified diffs are dynamically generated against the template. A progressive 4-tier hint deck (Level 1: Conceptual Root Cause, Level 2: Architectural Strategy, Level 3: Concrete Implementation, Level 4: Canonical Code Pattern) scaffolds learning without revealing instant answers.
- **Consequences:** Learners can safely iterate, inspect real-time diffs, and reset at any moment with complete filesystem isolation and traversal protection.

## ADR 009: Automated Repair Verification Pipeline with Fail-Closed Execution Gate and Anti-Shortcut Protection
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** In Phase 9, learner patches must be authoritatively verified against test suites. Because learner-submitted code is untrusted, executing it on the host operating system could lead to remote code execution. Furthermore, learners might attempt shortcuts, such as denying all requests (e.g. `return 403` universally) or hardcoding specific test cases.
- **Decision:** Verification is executed strictly inside hardened Docker containers (`proofforge-sandbox:latest`) configured with `--network=none`, `--memory=512m`, `--cpus=1.0`, `--user=1000:1000`, `--security-opt=no-new-privileges`, `--cap-drop=ALL`, `--read-only` root filesystem, and `--tmpfs /tmp:rw,noexec,nosuid,size=64m`.
  1. A strict **Fail-Closed Execution Gate** is enforced: if the Docker daemon is unreachable, execution immediately halts with `SECURITY_BLOCKED` rather than falling back to host subprocess execution.
  2. Pre-execution AST parsing catches Python syntax errors before container dispatch.
  3. The verification harness executes dual-boundary tests: positive tests for authorized users, negative tests for unauthorized cross-tenant requests, and regression tests for secondary tenants. A universal-deny patch triggers `REGRESSION_DETECTED`; hardcoding specific IDs triggers `INCOMPLETE`.
- **Consequences:** Provides definitive verification outcomes (`VERIFIED_FIXED`, `INCOMPLETE`, `REGRESSION_DETECTED`, `EXECUTION_FAILED`, `SECURITY_BLOCKED`) with zero risk of host compromise.

## ADR 010: Independent Skill Transfer Lab with Blind Test Grader and Unassisted Track Certification
- **Date:** 2026-10-31
- **Status:** Accepted
- **Context:** To prove genuine skill transfer beyond guided repetition ("vibe coding"), Phase 10 requires the learner to independently solve an unfamiliar variant in a new domain without scaffolding. The learner must not be able to inspect or tamper with the evaluation tests.
- **Decision:**
  1. Implemented a versioned Challenge Bank (e.g., `transfer-task-auth-v1`: Multi-tenant Task Collaboration API).
  2. Built a **Blind Student Sandbox**: student workspaces only contain the editable microservice file (`task_api.py`); the authoritative grader (`grader.py`) remains outside the student workspace and is injected read-only directly by the Docker runner.
  3. Grader evaluates cross-tenant permissions, reverse cross-tenant access, and legitimate tenant access.
  4. Track certification: learners who solve the challenge without requesting hints are permanently certified on the **Unassisted Track** (`is_unassisted: true`), feeding into the Learning Analytics Competency Matrix as `MASTERED (UNASSISTED)`.
- **Consequences:** Rigorously measures and validates true conceptual skill transfer from guided practice to independent engineering.

## ADR 011: Cryptographic Grader Protection & Container Boundary Isolation
- **Date:** 2026-11-01
- **Status:** Accepted (Milestone D Hardening)
- **Context:** Security audit revealed that learner code running in blind transfer challenges could potentially read the grader file if co-located in the same mount, spoof JSON output to stdout, or call `sys.exit(0)` to prematurely terminate the test harness.
- **Decision:**
  1. Student workspace mounted read-only at `/student_workspace:ro`; trusted test suite mounted read-only at `/grader_suite:ro`. Working directory set to `/grader_suite`.
  2. Grader execution is sealed by an ephemeral cryptographic HMAC nonce token (`secrets.token_hex(24)`). Authoritative results must be wrapped in signed delimiters (`<<<PROOFFORGE_GRADER_TOKEN_START:{token}>>>`). Any output without this token is unconditionally rejected as forged.
  3. Grader catches `SystemExit` during student module import and redirects student stdout/stderr.
- **Consequences:** Evaluator confidentiality and grading integrity are 100% mathematically and architecturally guaranteed. Verified by 7 adversarial test cases.

## ADR 012: Evidence-Proportionate Learning Heuristics & Transparent Evaluation
- **Date:** 2026-11-01
- **Status:** Accepted (Milestone D Validation)
- **Context:** Overclaiming mastery in application security engineering creates dangerous vulnerabilities. Claiming "100% Mastery" after solving one synthetic exercise misrepresents engineering competence.
- **Decision:**
  1. Display explicit counts and denominators across all KPI badges (`1 of 1 challenges passed`, `1 of 1 repairs verified`).
  2. Implement an explicit evaluation disclaimer banner explaining that statuses reflect product-defined heuristics measuring unit/integration test results across specific scenarios, not formal psychometric or academic certifications.
  3. Replace inflated claims with nuanced tiers (`INITIAL_TRANSFER_DEMONSTRATED`, `PRACTICED_MULTI_SCENARIO`, `MULTI_DOMAIN_RESILIENT`).
- **Consequences:** Defensible, rigorous, and honest educational feedback.
