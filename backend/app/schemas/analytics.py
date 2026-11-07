from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CompetencyItem(BaseModel):
    concept: str
    status: str  # MASTERED, IN_PROGRESS, NOT_STARTED
    guided_repairs_verified: int
    transfer_challenges_passed: int
    unassisted_transfer: bool
    summary: str

class LearningAnalyticsOverview(BaseModel):
    total_lessons_viewed: int
    guided_repairs_attempted: int
    guided_repairs_verified: int
    transfer_challenges_attempted: int
    transfer_challenges_passed: int
    unassisted_transfer_count: int
    hints_requested_total: int
    readiness_status: Optional[str] = "EVALUATION_PENDING"
    readiness_summary: Optional[str] = None
    competencies: List[CompetencyItem]
    recent_events: List[Dict[str, Any]]
