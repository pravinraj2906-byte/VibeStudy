import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.finding import Finding
from app.schemas.finding import (
    FindingOut,
    MentorExplanationOut,
    MentorHintRequest,
    MentorHintOut,
    ReproductionResultOut
)
from app.api.deps import get_current_user
from app.services.github_service import STORAGE_DIR
from app.services.security_scan_service import SecurityScanService
from app.services.gemini_service import GeminiService
from app.services.reproduction.coordinator import ReproductionCoordinator

router = APIRouter()
scan_service = SecurityScanService()
gemini_service = GeminiService()
reproduction_coordinator = ReproductionCoordinator()

@router.get("/scanners/status", summary="Get status and versions of all security scanners")
def get_scanners_status(
    current_user: User = Depends(get_current_user)
):
    """Returns the operational availability and version for each integrated scanner."""
    return scan_service.get_scanner_statuses()

@router.get("/{finding_id}", response_model=FindingOut, summary="Get finding details")
def get_finding(
    finding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves full details for a single security finding."""
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    
    # Verify project ownership
    project = db.query(Project).filter(Project.id == finding.project_id).first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return finding

@router.post("/{finding_id}/mentor/explain", response_model=MentorExplanationOut, summary="AI Mentor: Explain vulnerability")
def explain_finding_with_mentor(
    finding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Produces a source-grounded educational breakdown of a vulnerability with citations."""
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    project = db.query(Project).filter(Project.id == finding.project_id).first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Locate project disk directory if available
    sha_prefix = project.commit_sha[:8] if project.commit_sha else ""
    dest_dir = STORAGE_DIR / f"proj_{project.id}_{sha_prefix}"
    repo_path = str(dest_dir) if dest_dir.exists() else None

    explanation_data = gemini_service.explain_vulnerability(finding, repo_path)
    return explanation_data

@router.post("/{finding_id}/mentor/hint", response_model=MentorHintOut, summary="AI Mentor: Progressive hints")
def get_finding_hint(
    finding_id: int,
    req: MentorHintRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delivers progressive guidance across 4 structured levels:
    - Level 1: Conceptual hint
    - Level 2: Investigation direction
    - Level 3: Vulnerable code location and root cause
    - Level 4: Concrete repair strategy
    """
    if req.level < 1 or req.level > 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Level must be between 1 and 4")

    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    project = db.query(Project).filter(Project.id == finding.project_id).first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sha_prefix = project.commit_sha[:8] if project.commit_sha else ""
    dest_dir = STORAGE_DIR / f"proj_{project.id}_{sha_prefix}"
    repo_path = str(dest_dir) if dest_dir.exists() else None

    hint_data = gemini_service.get_progressive_hint(finding, req.level, repo_path)
    return hint_data

@router.post("/{finding_id}/reproduce", response_model=ReproductionResultOut, summary="Reproduce vulnerability defect in isolated sandbox")
def reproduce_finding_defect(
    finding_id: int,
    target_mode: str = Query("auto", description="'auto', 'fixture', or 'repository'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes safe sandboxed reproduction test for the defect, capturing verifiable evidence.
    - 'fixture': Executes controlled synthetic educational benchmark harness.
    - 'repository': Attempts reproduction against imported repository code (requires Docker; host fallback strictly disabled).
    - 'auto': Default. Uses fixture benchmark for educational demonstration.
    """
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    project = db.query(Project).filter(Project.id == finding.project_id).first()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sha_prefix = project.commit_sha[:8] if project.commit_sha else ""
    dest_dir = STORAGE_DIR / f"proj_{project.id}_{sha_prefix}"
    repo_path = str(dest_dir) if dest_dir.exists() else None

    if target_mode == "repository" and repo_path:
        return reproduction_coordinator.reproduce_repository_defect(db, finding, repo_path)

    reproduction_res = reproduction_coordinator.reproduce_defect(db, finding)
    return reproduction_res
