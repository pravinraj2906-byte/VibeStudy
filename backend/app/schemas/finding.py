from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class FindingBase(BaseModel):
    title: str
    description: str
    severity: str  # critical, high, medium, low, info
    category: str  # security, architecture, performance, code_quality
    file_path: str
    line_number: Optional[int] = None
    line_end: Optional[int] = None
    cwe_id: Optional[str] = None
    status: str = "open"  # open, in_progress, resolved, ignored
    scanner_name: str = "built_in"
    scanner_version: Optional[str] = None
    scanner_rule_id: Optional[str] = None
    confidence: str = "medium"  # high, medium, low
    code_snippet: Optional[str] = None
    risk_explanation: Optional[str] = None
    remediation: Optional[str] = None
    verification_status: str = "static_finding"
    reproduction_data: Optional[Dict[str, Any]] = None

class FindingCreate(FindingBase):
    project_id: int
    scan_job_id: Optional[int] = None

class FindingOut(FindingBase):
    id: int
    project_id: int
    scan_job_id: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ScanJobOut(BaseModel):
    id: int
    project_id: int
    commit_sha: str
    status: str
    error_message: Optional[str] = None
    summary_json: Optional[Dict[str, Any]] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MentorExplanationOut(BaseModel):
    finding_id: int
    title: str
    cwe_id: Optional[str] = None
    vulnerability_class: str
    root_cause: str
    attack_vector: str
    safe_remediation: str
    test_strategy: str
    cited_lines: List[int]
    citations_verified: bool
    explanation_markdown: str

class MentorHintRequest(BaseModel):
    level: int = 1  # 1 to 4

class MentorHintOut(BaseModel):
    finding_id: int
    level: int
    level_title: str
    hint_text: str
    next_level_available: bool

class ReproductionRequest(BaseModel):
    pass

class ReproductionResultOut(BaseModel):
    finding_id: int
    verification_status: str  # reproduction_verified, not_reproducible, inconclusive, unsupported
    runner_type: str  # docker, isolated_subprocess_fixture, isolated_subprocess, none
    expected_behavior: str
    observed_behavior: str
    test_command: str
    exit_code: int
    execution_log: str
    timestamp: datetime
    target_type: Optional[str] = "synthetic_fixture"
    target_label: Optional[str] = None
    security_boundary: Optional[str] = None

class LessonOut(BaseModel):
    id: int
    finding_id: int
    title: str
    concept: str
    content: str
    difficulty: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SkillChallengeOut(BaseModel):
    id: int
    lesson_id: int
    title: str
    problem_statement: str
    starter_code: Optional[str] = None
    solution_criteria: Optional[str] = None
    difficulty: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RepairAttemptCreate(BaseModel):
    finding_id: int
    step_number: int = 1
    code_diff: str

class RepairAttemptOut(BaseModel):
    id: int
    finding_id: int
    user_id: int
    step_number: int
    code_diff: Optional[str] = None
    passed: bool
    feedback: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
