"""add personal mentor memory

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-11-07 18:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mentor_memories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("teaching_mode", sa.String(length=32), nullable=False),
        sa.Column("learned_topics", sa.JSON(), nullable=False),
        sa.Column("conversation", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "project_id", name="uq_mentor_memory_user_project"),
    )
    op.create_index(op.f("ix_mentor_memories_id"), "mentor_memories", ["id"], unique=False)
    op.create_index(op.f("ix_mentor_memories_project_id"), "mentor_memories", ["project_id"], unique=False)
    op.create_index(op.f("ix_mentor_memories_user_id"), "mentor_memories", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_mentor_memories_user_id"), table_name="mentor_memories")
    op.drop_index(op.f("ix_mentor_memories_project_id"), table_name="mentor_memories")
    op.drop_index(op.f("ix_mentor_memories_id"), table_name="mentor_memories")
    op.drop_table("mentor_memories")

