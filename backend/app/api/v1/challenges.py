import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.challenge import (
    ChallengeListItem, ChallengeDetailResponse, ChallengeAttemptResponse,
    ChallengeDraftRequest, ChallengeSubmitRequest, ChallengeGradeResponse
)
from app.services.challenge.challenge_service import ChallengeService

router = APIRouter()
logger = logging.getLogger("proofforge.api.challenges")

@router.get(
    "/challenges",
    response_model=List[ChallengeListItem],
    summary="List available independent skill transfer challenges"
)
def list_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ChallengeService.list_challenges(db)


@router.get(
    "/challenges/{challenge_id}",
    response_model=ChallengeDetailResponse,
    summary="Get challenge instructions, starter files, and learning criteria"
)
def get_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ChallengeService.get_challenge_detail(db, challenge_id)


@router.post(
    "/challenges/{challenge_id}/start",
    response_model=ChallengeAttemptResponse,
    summary="Start or resume an isolated challenge attempt"
)
@router.post(
    "/challenges/{challenge_id}/attempt",
    response_model=ChallengeAttemptResponse,
    summary="Start or resume an isolated challenge attempt (alias)"
)
def start_challenge_attempt(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ChallengeService.start_or_resume_attempt(db, challenge_id, current_user.id)


@router.put(
    "/challenges/attempts/{attempt_id}/draft",
    summary="Save practice code draft in the challenge workspace"
)
def save_challenge_draft(
    attempt_id: int,
    req: ChallengeDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ChallengeService.save_draft(db, attempt_id, current_user.id, req.code)


@router.post(
    "/challenges/attempts/{attempt_id}/hint",
    summary="Request hint for challenge (marks attempt as assisted)"
)
def request_challenge_hint(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ChallengeService.request_hint(db, attempt_id, current_user.id)


@router.post(
    "/challenges/attempts/{attempt_id}/submit",
    response_model=ChallengeGradeResponse,
    summary="Submit independent solution for hidden test grading in container"
)
def submit_challenge(
    attempt_id: int,
    req: ChallengeSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ChallengeService.submit_and_grade(db, attempt_id, current_user.id, req.code)
