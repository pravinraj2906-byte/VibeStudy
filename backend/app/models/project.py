from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

def utcnow():
    return datetime.now(timezone.utc)

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    repo_url = Column(String(512), nullable=True)
    default_branch = Column(String(100), default="main", nullable=False)
    commit_sha = Column(String(100), nullable=True)
    framework = Column(String(100), nullable=True)
    language = Column(String(100), nullable=True)
    status = Column(String(50), default="imported", nullable=False)  # imported, scanning, ready, failed
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="projects")
    scan_jobs = relationship("ScanJob", back_populates="project", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="project", cascade="all, delete-orphan")


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    commit_sha = Column(String(100), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, running, completed, failed
    error_message = Column(Text, nullable=True)
    summary_json = Column(JSON, nullable=True)
    started_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="scan_jobs")
    findings = relationship("Finding", back_populates="scan_job")
