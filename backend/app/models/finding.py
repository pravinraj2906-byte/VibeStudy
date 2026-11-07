from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_job_id = Column(Integer, ForeignKey("scan_jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)  # critical, high, medium, low, info
    category = Column(String(50), nullable=False)  # security, architecture, performance, code_quality
    file_path = Column(String(512), nullable=False)
    line_number = Column(Integer, nullable=True)
    line_end = Column(Integer, nullable=True)
    cwe_id = Column(String(50), nullable=True)
    status = Column(String(50), default="open", nullable=False)  # open, in_progress, resolved, ignored
    
    # Milestone B extensions
    scanner_name = Column(String(100), default="built_in", nullable=False)
    scanner_version = Column(String(50), nullable=True)
    scanner_rule_id = Column(String(255), nullable=True)
    confidence = Column(String(50), default="medium", nullable=False)  # high, medium, low
    code_snippet = Column(Text, nullable=True)
    risk_explanation = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)
    verification_status = Column(String(50), default="static_finding", nullable=False)
    # static_finding, reproduction_verified, not_reproducible, inconclusive, scanner_unavailable
    reproduction_data = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    project = relationship("Project", back_populates="findings")
    scan_job = relationship("ScanJob", back_populates="findings")
    lessons = relationship("Lesson", back_populates="finding", cascade="all, delete-orphan")
    repair_attempts = relationship("RepairAttempt", back_populates="finding", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    concept = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    difficulty = Column(String(50), default="intermediate", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    finding = relationship("Finding", back_populates="lessons")
    skill_challenges = relationship("SkillChallenge", back_populates="lesson", cascade="all, delete-orphan")


class RepairAttempt(Base):
    __tablename__ = "repair_attempts"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, default=1, nullable=False)
    code_diff = Column(Text, nullable=True)
    passed = Column(Boolean, default=False, nullable=False)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    finding = relationship("Finding", back_populates="repair_attempts")
    user = relationship("User", back_populates="repair_attempts")


class SkillChallenge(Base):
    __tablename__ = "skill_challenges"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    problem_statement = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=True)
    solution_criteria = Column(Text, nullable=True)
    difficulty = Column(String(50), default="intermediate", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    lesson = relationship("Lesson", back_populates="skill_challenges")
