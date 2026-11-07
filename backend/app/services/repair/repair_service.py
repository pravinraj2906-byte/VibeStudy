import os
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.repair import RepairSession, RepairPatch
from app.models.finding import Finding
from app.models.project import Project
from app.services.repair.workspace_manager import WorkspaceManager, WorkspaceSecurityError
from app.services.gemini_service import GeminiService

logger = logging.getLogger("proofforge.repair.service")
gemini_service = GeminiService()

class RepairService:
    @staticmethod
    def get_or_create_session(
        db: Session,
        user_id: int,
        project_id: int,
        finding_id: int,
        fixture_id: str = "fixture_idor"
    ) -> RepairSession:
        # 1. Verify project ownership
        project = db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or unauthorized.")

        # 2. Verify finding exists on this project
        finding = db.query(Finding).filter(Finding.id == finding_id, Finding.project_id == project_id).first()
        if not finding:
            raise HTTPException(status_code=404, detail="Finding not found for this project.")

        # 3. Check for existing active session
        session = db.query(RepairSession).filter(
            RepairSession.user_id == user_id,
            RepairSession.finding_id == finding_id,
            RepairSession.status.in_(["active", "submitted", "verified"])
        ).first()

        if not session:
            # Create new session record
            session = RepairSession(
                user_id=user_id,
                project_id=project_id,
                finding_id=finding_id,
                fixture_id=fixture_id,
                workspace_dir="",
                status="active",
                hints_requested=[],
                patch_attempts_count=0,
                current_verification_status="pending"
            )
            db.add(session)
            db.commit()
            db.refresh(session)

            # Initialize isolated practice workspace
            workspace_dir = WorkspaceManager.initialize_workspace(session.id, fixture_id)
            session.workspace_dir = workspace_dir
            db.commit()
            db.refresh(session)

        return session

    @staticmethod
    def get_session(db: Session, session_id: int, user_id: int) -> RepairSession:
        session = db.query(RepairSession).filter(
            RepairSession.id == session_id,
            RepairSession.user_id == user_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Repair session not found or access denied.")
        return session

    @classmethod
    def get_session_view(cls, db: Session, session_id: int, user_id: int) -> Dict[str, Any]:
        session = cls.get_session(db, session_id, user_id)
        file_path = "app.py"

        # Read original template & current practice code
        try:
            original_code = WorkspaceManager.read_original_code(session.fixture_id, file_path)
            practice_code = WorkspaceManager.read_practice_code(session.id, file_path)
        except WorkspaceSecurityError as e:
            raise HTTPException(status_code=400, detail=str(e))

        diff = WorkspaceManager.compute_diff(original_code, practice_code, file_path)

        return {
            "id": session.id,
            "user_id": session.user_id,
            "project_id": session.project_id,
            "finding_id": session.finding_id,
            "fixture_id": session.fixture_id,
            "status": session.status,
            "hints_requested": session.hints_requested or [],
            "patch_attempts_count": session.patch_attempts_count,
            "current_verification_status": session.current_verification_status,
            "file_path": file_path,
            "editable_code": practice_code,
            "original_code": original_code,
            "diff": diff,
            "created_at": session.created_at,
            "updated_at": session.updated_at
        }

    @classmethod
    def save_draft(cls, db: Session, session_id: int, user_id: int, file_path: str, code: str) -> Dict[str, Any]:
        session = cls.get_session(db, session_id, user_id)
        try:
            WorkspaceManager.write_practice_code(session.id, file_path, code)
            original_code = WorkspaceManager.read_original_code(session.fixture_id, file_path)
            diff = WorkspaceManager.compute_diff(original_code, code, file_path)
        except WorkspaceSecurityError as e:
            raise HTTPException(status_code=400, detail=str(e))

        db.commit()
        return {
            "session_id": session.id,
            "file_path": file_path,
            "diff": diff,
            "saved": True
        }

    @classmethod
    def reset_workspace(cls, db: Session, session_id: int, user_id: int) -> Dict[str, Any]:
        session = cls.get_session(db, session_id, user_id)
        try:
            WorkspaceManager.reset_workspace(session.id, session.fixture_id)
            original_code = WorkspaceManager.read_original_code(session.fixture_id, "app.py")
        except WorkspaceSecurityError as e:
            raise HTTPException(status_code=400, detail=str(e))

        session.current_verification_status = "pending"
        db.commit()

        return {
            "session_id": session.id,
            "status": "reset",
            "editable_code": original_code,
            "diff": ""
        }

    @classmethod
    def request_hint(cls, db: Session, session_id: int, user_id: int, level: int) -> Dict[str, Any]:
        session = cls.get_session(db, session_id, user_id)
        finding = db.query(Finding).filter(Finding.id == session.finding_id).first()
        if not finding:
            raise HTTPException(status_code=404, detail="Finding not found.")

        # Progressive Socratic hints for IDOR
        hint_titles = {
            1: "Concept: Object-Level Authorization",
            2: "Investigation: Inspecting the Handler Signature",
            3: "Root Cause & Location: Unchecked Resource Ownership",
            4: "Concrete Repair Strategy: Enforce Tenant Matching"
        }
        
        hint_texts = {
            1: "Object-level authorization ensures that the authenticated user is genuinely the owner of, or authorized to access, the requested resource identifier.",
            2: "Examine `get_invoice(invoice_id: int, x_user_id: str)`. Notice that while `x_user_id` identifies the caller, the retrieved invoice's `owner_id` is never compared against `x_user_id`.",
            3: "In `app.py` lines 20-25, `INVOICES[invoice_id]` is returned directly after existence check without verifying `invoice['owner_id'] == x_user_id`.",
            4: "After verifying the invoice exists, compare `invoice['owner_id'] != x_user_id`. If they do not match, immediately raise `HTTPException(status_code=403, detail='Access forbidden')`."
        }

        title = hint_titles.get(level, f"Level {level} Guidance")
        hint_text = hint_texts.get(level, "Review the endpoint logic to enforce owner authorization.")

        # Persist hints unlocked
        current_hints = list(session.hints_requested or [])
        if level not in current_hints:
            current_hints.append(level)
            current_hints.sort()
            session.hints_requested = current_hints
            db.commit()

        return {
            "session_id": session.id,
            "level": level,
            "title": title,
            "hint_text": hint_text,
            "hints_unlocked": current_hints
        }

    @classmethod
    def ask_socratic_coach(cls, db: Session, session_id: int, user_id: int, question: str) -> str:
        session = cls.get_session(db, session_id, user_id)
        finding = db.query(Finding).filter(Finding.id == session.finding_id).first()
        try:
            practice_code = WorkspaceManager.read_practice_code(session.id, "app.py")
        except Exception:
            practice_code = ""

        prompt = f"""
You are the ProofForge Socratic Engineering Coach guiding a developer repairing an IDOR (Missing Object-Level Authorization) vulnerability.
FINDING CONTEXT:
Title: {finding.title if finding else 'Missing Authorization'}
CWE: {finding.cwe_id if finding else 'CWE-639'}

CURRENT PRACTICE CODE IN LEARNER WORKSPACE:
```python
{practice_code}
```

LEARNER QUESTION:
"{question}"

COACHING RULES:
1. Provide pedagogical, concept-grounded guidance to help the developer think through the solution.
2. DO NOT write the complete final code or patch directly for them. Guide them to formulate the logic themselves.
3. Keep the reply concise (1-2 paragraphs), actionable, and friendly.
"""
        response = gemini_service._generate_with_fallback(prompt)
        return response or "Remember to verify that the requesting user's identity matches the resource's owner before returning confidential records."
