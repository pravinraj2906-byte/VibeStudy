from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class ChallengeDefinition(Base):
    __tablename__ = "challenge_definitions"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String(100), unique=True, index=True, nullable=False)
    concept = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=False)
    difficulty = Column(String(50), default="intermediate", nullable=False)
    scenario = Column(Text, nullable=False)
    starter_files_dir = Column(String(255), nullable=False)
    editable_file = Column(String(255), default="task_api.py", nullable=False)
    hidden_test_script = Column(String(255), default="grader.py", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    attempts = relationship("ChallengeAttempt", back_populates="challenge_definition", cascade="all, delete-orphan")


class ChallengeAttempt(Base):
    __tablename__ = "challenge_attempts"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String(100), ForeignKey("challenge_definitions.challenge_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="in_progress", nullable=False)  # in_progress, passed, failed
    is_unassisted = Column(Boolean, default=True, nullable=False)
    hints_used = Column(JSON, default=list, nullable=False)
    workspace_dir = Column(String(512), nullable=False)
    submitted_code = Column(Text, nullable=True)
    diff = Column(Text, nullable=True)
    score = Column(Integer, default=0, nullable=False)
    max_score = Column(Integer, default=6, nullable=False)
    test_results = Column(JSON, nullable=True)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    challenge_definition = relationship("ChallengeDefinition", back_populates="attempts")
    user = relationship("User")
