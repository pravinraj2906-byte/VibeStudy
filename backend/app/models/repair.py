from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class RepairSession(Base):
    __tablename__ = "repair_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    fixture_id = Column(String(100), default="fixture_idor", nullable=False)
    workspace_dir = Column(String(512), nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, submitted, verified, abandoned
    hints_requested = Column(JSON, default=list, nullable=False)  # list of int levels: [1, 2]
    patch_attempts_count = Column(Integer, default=0, nullable=False)
    current_verification_status = Column(String(50), default="pending", nullable=False)
    # pending, verified_fixed, incomplete, regression_detected, execution_failed, security_blocked

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User")
    project = relationship("Project")
    finding = relationship("Finding")
    patches = relationship("RepairPatch", back_populates="repair_session", cascade="all, delete-orphan", order_by="RepairPatch.attempt_number.desc()")


class RepairPatch(Base):
    __tablename__ = "repair_patches"

    id = Column(Integer, primary_key=True, index=True)
    repair_session_id = Column(Integer, ForeignKey("repair_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number = Column(Integer, default=1, nullable=False)
    file_path = Column(String(255), nullable=False)
    original_code = Column(Text, nullable=False)
    proposed_code = Column(Text, nullable=False)
    diff = Column(Text, nullable=False)
    verification_status = Column(String(50), nullable=False)
    # VERIFIED_FIXED, INCOMPLETE, REGRESSION_DETECTED, EXECUTION_FAILED, SECURITY_BLOCKED, INCONCLUSIVE
    verification_output = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    repair_session = relationship("RepairSession", back_populates="patches")
    user = relationship("User")
