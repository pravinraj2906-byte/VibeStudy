from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class RepairSessionCreate(BaseModel):
    finding_id: int
    fixture_id: Optional[str] = "fixture_idor"

class RepairSessionResponse(BaseModel):
    id: int
    user_id: int
    project_id: int
    finding_id: int
    fixture_id: str
    status: str
    hints_requested: List[int]
    patch_attempts_count: int
    current_verification_status: str
    file_path: str
    editable_code: str
    original_code: str
    diff: str
    created_at: datetime
    updated_at: datetime

class SaveDraftRequest(BaseModel):
    file_path: str = Field(..., max_length=255)
    code: str = Field(..., max_length=500000)

class SaveDraftResponse(BaseModel):
    session_id: int
    file_path: str
    diff: str
    saved: bool

class SubmitPatchRequest(BaseModel):
    file_path: str = Field(..., max_length=255)
    code: str = Field(..., max_length=500000)

class TestOutcome(BaseModel):
    test_name: str
    passed: bool
    description: str
    observed: Optional[str] = None
    expected: Optional[str] = None

class VerificationResponse(BaseModel):
    patch_id: int
    session_id: int
    attempt_number: int
    verification_status: str  # VERIFIED_FIXED, INCOMPLETE, REGRESSION_DETECTED, EXECUTION_FAILED, SECURITY_BLOCKED
    summary: str
    test_results: List[TestOutcome]
    before_status: str
    after_status: str
    diff: str
    runner_type: str
    execution_log: str
    timestamp: datetime

class RepairPatchHistoryItem(BaseModel):
    id: int
    attempt_number: int
    file_path: str
    diff: str
    verification_status: str
    summary: Optional[str] = None
    created_at: datetime

class SocraticHintRequest(BaseModel):
    level: int = Field(..., ge=1, le=4)

class SocraticHintResponse(BaseModel):
    session_id: int
    level: int
    title: str
    hint_text: str
    hints_unlocked: List[int]

class SocraticQuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)

class SocraticQuestionResponse(BaseModel):
    session_id: int
    question: str
    guidance: str
