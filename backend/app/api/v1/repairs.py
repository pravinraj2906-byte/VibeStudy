import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.repair import RepairSession, RepairPatch
from app.schemas.repair import (
    RepairSessionCreate, RepairSessionResponse, SaveDraftRequest, SaveDraftResponse,
    SubmitPatchRequest, VerificationResponse, RepairPatchHistoryItem,
    SocraticHintRequest, SocraticHintResponse, SocraticQuestionRequest, SocraticQuestionResponse
)
from app.services.repair.repair_service import RepairService
from app.services.repair.verifier import RepairVerifier

router = APIRouter()
logger = logging.getLogger("proofforge.api.repairs")

@router.post(
    "/projects/{project_id}/findings/{finding_id}/repair-session",
    response_model=RepairSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or resume a persistent guided repair session for a finding"
)
def create_or_resume_repair_session(
    project_id: int,
    finding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = RepairService.get_or_create_session(
        db=db,
        user_id=current_user.id,
        project_id=project_id,
        finding_id=finding_id,
        fixture_id="fixture_idor"
    )
    view = RepairService.get_session_view(db, session.id, current_user.id)
    return view


@router.get(
    "/repair-sessions/{session_id}",
    response_model=RepairSessionResponse,
    summary="Retrieve repair session details, editable code, and diff"
)
def get_repair_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return RepairService.get_session_view(db, session_id, current_user.id)


@router.put(
    "/repair-sessions/{session_id}/draft",
    response_model=SaveDraftResponse,
    summary="Save practice code draft in the isolated session workspace"
)
def save_practice_draft(
    session_id: int,
    req: SaveDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return RepairService.save_draft(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        file_path=req.file_path,
        code=req.code
    )


@router.post(
    "/repair-sessions/{session_id}/reset",
    summary="Reset practice workspace back to original immutable template"
)
def reset_repair_workspace(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return RepairService.reset_workspace(db, session_id, current_user.id)


@router.post(
    "/repair-sessions/{session_id}/hints",
    response_model=SocraticHintResponse,
    summary="Request a progressive Socratic hint (Levels 1-4)"
)
def request_repair_hint(
    session_id: int,
    req: SocraticHintRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return RepairService.request_hint(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        level=req.level
    )


@router.post(
    "/repair-sessions/{session_id}/coach",
    response_model=SocraticQuestionResponse,
    summary="Ask Socratic coach a question grounded in finding evidence"
)
def ask_socratic_coach(
    session_id: int,
    req: SocraticQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    guidance = RepairService.ask_socratic_coach(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        question=req.question
    )
    return {
        "session_id": session_id,
        "question": req.question,
        "guidance": guidance
    }


@router.post(
    "/repair-sessions/{session_id}/verify",
    response_model=VerificationResponse,
    summary="Submit proposed patch for automated container verification"
)
def verify_repair_patch(
    session_id: int,
    req: SubmitPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return RepairVerifier.verify_patch(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        file_path=req.file_path,
        code=req.code
    )


@router.get(
    "/repair-sessions/{session_id}/patches",
    response_model=List[RepairPatchHistoryItem],
    summary="Get patch verification attempt history for this session"
)
def get_patch_history(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = RepairService.get_session(db, session_id, current_user.id)
    patches = db.query(RepairPatch).filter(
        RepairPatch.repair_session_id == session.id
    ).order_by(RepairPatch.attempt_number.desc()).all()

    items = []
    for p in patches:
        summary = ""
        if isinstance(p.verification_output, dict):
            summary = p.verification_output.get("summary", "")
        items.append({
            "id": p.id,
            "attempt_number": p.attempt_number,
            "file_path": p.file_path,
            "diff": p.diff,
            "verification_status": p.verification_status,
            "summary": summary,
            "created_at": p.created_at
        })
    return items
