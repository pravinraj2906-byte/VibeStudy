from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint

from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class MentorMemory(Base):
    __tablename__ = "mentor_memories"
    __table_args__ = (
        UniqueConstraint("user_id", "project_id", name="uq_mentor_memory_user_project"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    goal = Column(Text, nullable=False, default="Understand this project well enough to explain and improve it")
    teaching_mode = Column(String(32), nullable=False, default="guided")
    learned_topics = Column(JSON, nullable=False, default=list)
    conversation = Column(JSON, nullable=False, default=list)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

