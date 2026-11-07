from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.mentor_memory import MentorMemory
from app.models.project import Project
from app.models.user import User
from app.schemas.mentor_memory import MentorMemoryOut, MentorMemoryUpdate


router = APIRouter()


def owned_project(project_id: int, current_user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project")
    return project


@router.get("/{project_id}/mentor-memory", response_model=MentorMemoryOut, summary="Get personal project mentor memory")
def get_mentor_memory(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owned_project(project_id, current_user, db)
    memory = db.query(MentorMemory).filter(
        MentorMemory.user_id == current_user.id,
        MentorMemory.project_id == project_id,
    ).first()
    if memory:
        return memory

    memory = MentorMemory(user_id=current_user.id, project_id=project_id)
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


@router.put("/{project_id}/mentor-memory", response_model=MentorMemoryOut, summary="Save personal project mentor memory")
def save_mentor_memory(
    project_id: int,
    payload: MentorMemoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owned_project(project_id, current_user, db)
    memory = db.query(MentorMemory).filter(
        MentorMemory.user_id == current_user.id,
        MentorMemory.project_id == project_id,
    ).first()
    if not memory:
        memory = MentorMemory(user_id=current_user.id, project_id=project_id)
        db.add(memory)

    memory.goal = payload.goal
    memory.teaching_mode = payload.teaching_mode
    memory.learned_topics = payload.learned_topics[-12:]
    memory.conversation = payload.conversation[-30:]
    db.commit()
    db.refresh(memory)
    return memory

