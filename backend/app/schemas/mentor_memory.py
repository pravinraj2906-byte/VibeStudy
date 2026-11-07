from datetime import datetime
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field


class MentorMemoryUpdate(BaseModel):
    goal: str = Field(..., min_length=1, max_length=1000)
    teaching_mode: Literal["guided", "concise", "deep-dive"] = "guided"
    learned_topics: List[str] = Field(default_factory=list, max_length=12)
    conversation: List[Dict[str, Any]] = Field(default_factory=list, max_length=30)


class MentorMemoryOut(MentorMemoryUpdate):
    id: int
    user_id: int
    project_id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

