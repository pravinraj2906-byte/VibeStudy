export interface User {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
  auth_provider?: string;
  firebase_uid?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MentorMemoryRecord {
  id: number;
  user_id: number;
  project_id: number;
  goal: string;
  teaching_mode: 'guided' | 'concise' | 'deep-dive';
  learned_topics: string[];
  conversation: Array<{
    id: string;
    sender: 'user' | 'mentor';
    text: string;
    timestamp: string;
  }>;
  updated_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  repo_url?: string;
  default_branch: string;
  commit_sha?: string;
  framework?: string;
  language?: string;
  status: 'imported' | 'scanning' | 'ready' | 'failed';
  metadata_json?: {
    github?: {
      owner: string;
      repo: string;
      stars: number;
      description: string;
    };
    download?: {
      extracted_files: number;
      total_size_bytes: number;
    };
    stack?: {
      framework: string;
      language: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      has_dockerfile: boolean;
      has_env_example: boolean;
    };
    components_count?: number;
    components?: Array<{
      name: string;
      file_path: string;
      line_number: number;
      type: string;
    }>;
    routes?: {
      frontend: Array<{ path: string; file_path: string; line_number: number }>;
      backend: Array<{ method: string; path: string; file_path: string; line_number: number }>;
    };
    api_calls_count?: number;
    api_calls?: Array<{
      client: string;
      endpoint: string;
      file_path: string;
      line_number: number;
    }>;
    ai_overview?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface FileContentResponse {
  project_id: number;
  path: string;
  content: string;
  size: number;
  is_truncated: boolean;
}

export interface ComponentExplanation {
  project_id: number;
  file_path: string;
  explanation: string;
  framework?: string;
  dependencies: string[];
  routes: string[];
  source_references: Array<{
    line: number;
    content: string;
  }>;
}

export interface SystemHealth {
  status: string;
  database: string;
  provider: string;
  latency_ms: number;
}

// Milestone B Types: Security Intelligence & Controlled Defect Reproduction
export interface Finding {
  id: number;
  project_id: number;
  scan_job_id?: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'architecture' | 'performance' | 'code_quality';
  file_path: string;
  line_number?: number;
  line_end?: number;
  cwe_id?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';
  scanner_name: string;
  scanner_version?: string;
  scanner_rule_id?: string;
  confidence: 'high' | 'medium' | 'low';
  code_snippet?: string;
  risk_explanation?: string;
  remediation?: string;
  verification_status: 'static_finding' | 'reproduction_verified' | 'not_reproducible' | 'inconclusive' | 'scanner_unavailable' | 'unsupported';
  reproduction_data?: {
    status: string;
    runner_type: string;
    target_type?: 'synthetic_fixture' | 'imported_repository_code';
    target_label?: string;
    security_boundary?: string;
    expected_behavior: string;
    observed_behavior: string;
    test_command: string;
    exit_code: number;
    execution_log: string;
    timestamp: string;
  };
  created_at: string;
}

export interface ScanJob {
  id: number;
  project_id: number;
  commit_sha: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  summary_json?: {
    total_findings: number;
    severity_counts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    scanners: Record<string, {
      status: string;
      version?: string;
      findings_count: number;
      error_message?: string;
    }>;
  };
  started_at: string;
  completed_at?: string;
}

export interface ScannerStatus {
  available: boolean;
  version?: string;
  status: 'ready' | 'scanner_unavailable';
}

export type ScannerStatusMap = Record<string, ScannerStatus>;

export interface MentorExplanation {
  finding_id: number;
  title: string;
  cwe_id?: string;
  vulnerability_class: string;
  root_cause: string;
  attack_vector: string;
  safe_remediation: string;
  test_strategy: string;
  cited_lines: number[];
  citations_verified: boolean;
  explanation_markdown: string;
}

export interface MentorHint {
  finding_id: number;
  level: number;
  level_title: string;
  hint_text: string;
  next_level_available: boolean;
}

export interface ReproductionResult {
  finding_id: number;
  verification_status: 'reproduction_verified' | 'not_reproducible' | 'inconclusive' | 'unsupported';
  runner_type: 'docker' | 'isolated_subprocess_fixture' | 'isolated_subprocess' | 'none';
  target_type?: 'synthetic_fixture' | 'imported_repository_code';
  target_label?: string;
  security_boundary?: string;
  expected_behavior: string;
  observed_behavior: string;
  test_command: string;
  exit_code: number;
  execution_log: string;
  timestamp: string;
}

// Milestone C Types: Learn-to-Fix Verification & Skill Transfer Lab
export interface RepairSession {
  id: number;
  user_id: number;
  project_id: number;
  finding_id: number;
  fixture_id: string;
  status: 'open' | 'in_progress' | 'verified_fixed' | 'abandoned';
  hints_requested: number[];
  patch_attempts_count: number;
  current_verification_status: string;
  file_path: string;
  editable_code: string;
  original_code: string;
  diff: string;
  created_at: string;
  updated_at: string;
}

export interface SaveDraftResponse {
  session_id: number;
  file_path: string;
  diff: string;
  saved: boolean;
}

export interface TestOutcome {
  test_name: string;
  passed: boolean;
  description: string;
  observed?: string;
  expected?: string;
}

export interface VerificationResponse {
  patch_id: number;
  session_id: number;
  attempt_number: number;
  verification_status: 'VERIFIED_FIXED' | 'INCOMPLETE' | 'REGRESSION_DETECTED' | 'EXECUTION_FAILED' | 'SECURITY_BLOCKED';
  summary: string;
  test_results: TestOutcome[];
  before_status: string;
  after_status: string;
  diff: string;
  runner_type: string;
  execution_log: string;
  timestamp: string;
}

export interface RepairPatchHistoryItem {
  id: number;
  attempt_number: number;
  file_path: string;
  diff: string;
  verification_status: string;
  summary?: string;
  created_at: string;
}

export interface SocraticHintResponse {
  session_id: number;
  level: number;
  title: string;
  hint_text: string;
  hints_unlocked: number[];
}

export interface SocraticQuestionResponse {
  session_id: number;
  question: string;
  guidance: string;
}

export interface ChallengeListItem {
  challenge_id: string;
  concept: string;
  title: string;
  domain: string;
  difficulty: string;
  scenario: string;
  editable_file: string;
}

export interface ChallengeDetailResponse {
  challenge_id: string;
  concept: string;
  title: string;
  domain: string;
  difficulty: string;
  scenario: string;
  editable_file: string;
  starter_code: string;
  original_code: string;
  rules: string[];
}

export interface ChallengeAttemptResponse {
  id: number;
  challenge_id: string;
  user_id: number;
  attempt_number: number;
  status: 'in_progress' | 'passed' | 'failed';
  is_unassisted: boolean;
  hints_used: number[];
  editable_file: string;
  current_code: string;
  diff: string;
  score: number;
  max_score: number;
  feedback?: string;
  created_at: string;
  completed_at?: string;
}

export interface ChallengeTestResultItem {
  name: string;
  passed: boolean;
  description: string;
  details?: string;
}

export interface ChallengeGradeResponse {
  attempt_id: number;
  challenge_id: string;
  status: 'passed' | 'failed';
  is_unassisted: boolean;
  score: number;
  max_score: number;
  passed_all: boolean;
  test_results: ChallengeTestResultItem[];
  feedback: string;
  runner_type: string;
  completed_at: string;
}

export interface CompetencyItem {
  concept: string;
  status: 'TRANSFER_DEMONSTRATED' | 'MASTERED' | 'IN_PROGRESS' | 'PRACTICE_STARTED' | 'NOT_STARTED';
  guided_repairs_verified: number;
  transfer_challenges_passed: number;
  unassisted_transfer: boolean;
  summary: string;
}

export interface LearningAnalyticsOverview {
  total_lessons_viewed: number;
  guided_repairs_attempted: number;
  guided_repairs_verified: number;
  transfer_challenges_attempted: number;
  transfer_challenges_passed: number;
  unassisted_transfer_count: number;
  hints_requested_total: number;
  readiness_status?: string;
  readiness_summary?: string;
  competencies: CompetencyItem[];
  recent_events: Array<Record<string, any>>;
}
