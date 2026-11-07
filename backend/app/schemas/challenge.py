from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ChallengeListItem(BaseModel):
    challenge_id: str
    concept: str
    title: str
    domain: str
    difficulty: str
    scenario: str
    editable_file: str

class ChallengeDetailResponse(BaseModel):
    challenge_id: str
    concept: str
    title: str
    domain: str
    difficulty: str
    scenario: str
    editable_file: str
    starter_code: str
    original_code: str
    rules: List[str]

class ChallengeAttemptResponse(BaseModel):
    id: int
    challenge_id: str
    user_id: int
    attempt_number: int
    status: str  # in_progress, passed, failed
    is_unassisted: bool
    hints_used: List[int]
    editable_file: str
    current_code: str
    diff: str
    score: int
    max_score: int
    feedback: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class ChallengeDraftRequest(BaseModel):
    code: str = Field(..., max_length=500000)

class ChallengeSubmitRequest(BaseModel):
    code: str = Field(..., max_length=500000)

class ChallengeTestResultItem(BaseModel):
    name: str
    passed: bool
    description: str
    details: Optional[str] = None

class ChallengeGradeResponse(BaseModel):
    attempt_id: int
    challenge_id: str
    status: str  # passed, failed
    is_unassisted: bool
    score: int
    max_score: int
    passed_all: bool
    test_results: List[ChallengeTestResultItem]
    feedback: str
    runner_type: str
    completed_at: datetime
