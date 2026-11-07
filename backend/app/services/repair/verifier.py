import os
import sys
import ast
import json
import shutil
import logging
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.repair import RepairSession, RepairPatch
from app.services.repair.workspace_manager import WorkspaceManager, WorkspaceSecurityError
from app.services.scanners.docker_support import is_docker_available

logger = logging.getLogger("proofforge.repair.verifier")

DOCKER_IMAGE = "proofforge-sandbox:latest"

def utcnow():
    return datetime.now(timezone.utc)

class RepairVerifier:
    @classmethod
    def verify_patch(
        cls,
        db: Session,
        session_id: int,
        user_id: int,
        file_path: str,
        code: str
    ) -> Dict[str, Any]:
        session = db.query(RepairSession).filter(
            RepairSession.id == session_id,
            RepairSession.user_id == user_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Repair session not found or unauthorized.")

        try:
            clean_file = WorkspaceManager.validate_file_path(file_path)
            WorkspaceManager.validate_code_payload(code)
        except WorkspaceSecurityError as wse:
            raise HTTPException(status_code=400, detail=str(wse))

        # 1. Preliminary Local Syntax Check
        try:
            ast.parse(code)
        except SyntaxError as syn_err:
            return cls._record_failed_patch(
                db=db,
                session=session,
                user_id=user_id,
                file_path=clean_file,
                code=code,
                status="EXECUTION_FAILED",
                summary=f"Python syntax error at line {syn_err.lineno}: {syn_err.msg}",
                test_results=[{
                    "test_name": "Syntax & Compilation Check",
                    "passed": False,
                    "description": "Code contains fatal Python syntax error.",
                    "observed": f"SyntaxError: {syn_err}",
                    "expected": "Valid Python AST"
                }],
                raw_log=str(syn_err),
                runner_type="pre_execution_ast_parser"
            )

        # 2. Write proposed code to practice workspace
        try:
            WorkspaceManager.write_practice_code(session.id, clean_file, code)
        except WorkspaceSecurityError as wse:
            return cls._record_failed_patch(
                db=db,
                session=session,
                user_id=user_id,
                file_path=clean_file,
                code=code,
                status="SECURITY_BLOCKED",
                summary=f"Security policy violation: {wse}",
                test_results=[],
                raw_log=str(wse),
                runner_type="workspace_security_guard"
            )

        # 3. Docker Isolation Fail-Closed Gate
        # Untrusted learner code must NEVER execute on the host
        if not is_docker_available():
            logger.error("Docker daemon unavailable. Blocking untrusted patch execution.")
            return cls._record_failed_patch(
                db=db,
                session=session,
                user_id=user_id,
                file_path=clean_file,
                code=code,
                status="SECURITY_BLOCKED",
                summary="Automated verification blocked: Docker container isolation is required for executing user-modified code.",
                test_results=[],
                raw_log="FAIL-CLOSED ENFORCEMENT: Docker isolation unavailable. Direct host execution denied.",
                runner_type="fail_closed_policy"
            )

        # 4. Execute Verification Suite inside Hardened Docker Container
        workspace_dir = os.path.abspath(WorkspaceManager.get_workspace_dir(session.id))
        docker_cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", "512m",
            "--cpus", "1.0",
            "--user", "1000:1000",
            "--security-opt", "no-new-privileges",
            "--cap-drop", "ALL",
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
            "-v", f"{workspace_dir}:/app:ro",
            "-w", "/app",
            DOCKER_IMAGE,
            "python", "verify_test.py"
        ]

        logger.info(f"Running repair verification in container for session {session_id}...")
        try:
            proc = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=25
            )
            raw_stdout = proc.stdout.strip()
            raw_stderr = proc.stderr.strip()
            exit_code = proc.returncode
        except subprocess.TimeoutExpired:
            return cls._record_failed_patch(
                db=db,
                session=session,
                user_id=user_id,
                file_path=clean_file,
                code=code,
                status="EXECUTION_FAILED",
                summary="Execution timed out after 25 seconds in hardened container.",
                test_results=[],
                raw_log="Container timeout exceeded.",
                runner_type="docker"
            )
        except Exception as ex:
            return cls._record_failed_patch(
                db=db,
                session=session,
                user_id=user_id,
                file_path=clean_file,
                code=code,
                status="EXECUTION_FAILED",
                summary=f"Container execution error: {ex}",
                test_results=[],
                raw_log=str(ex),
                runner_type="docker"
            )

        # 5. Parse test results JSON from container output
        parsed_status = "EXECUTION_FAILED"
        summary = "Could not parse test runner output."
        tests_list = []

        try:
            # Locate JSON block in stdout
            json_start = raw_stdout.find("{")
            json_end = raw_stdout.rfind("}")
            if json_start != -1 and json_end != -1 and json_end >= json_start:
                data = json.loads(raw_stdout[json_start:json_end + 1])
                parsed_status = data.get("status", "INCOMPLETE")
                summary = data.get("summary", "")
                tests_list = data.get("tests", [])
            else:
                summary = raw_stderr or raw_stdout or "No test result reported."
        except Exception as jde:
            logger.warning(f"Failed to parse verify_test.py JSON output: {jde}")
            summary = f"Runner parsing failed: {jde}. Raw output: {raw_stdout[:200]}"

        # 6. Save Patch & Update Session
        original_code = WorkspaceManager.read_original_code(session.fixture_id, clean_file)
        diff = WorkspaceManager.compute_diff(original_code, code, clean_file)
        before_status = session.current_verification_status

        session.patch_attempts_count += 1
        session.current_verification_status = parsed_status.lower()
        if parsed_status == "VERIFIED_FIXED":
            session.status = "verified"
        else:
            session.status = "submitted"
        session.updated_at = utcnow()

        patch = RepairPatch(
            repair_session_id=session.id,
            user_id=user_id,
            attempt_number=session.patch_attempts_count,
            file_path=clean_file,
            original_code=original_code,
            proposed_code=code,
            diff=diff,
            verification_status=parsed_status,
            verification_output={
                "summary": summary,
                "tests": tests_list,
                "exit_code": exit_code,
                "stdout": raw_stdout,
                "stderr": raw_stderr,
                "runner_type": "docker"
            },
            created_at=utcnow()
        )
        db.add(patch)
        db.commit()
        db.refresh(patch)

        return {
            "patch_id": patch.id,
            "session_id": session.id,
            "attempt_number": patch.attempt_number,
            "verification_status": parsed_status,
            "summary": summary,
            "test_results": tests_list,
            "before_status": before_status,
            "after_status": parsed_status,
            "diff": diff,
            "runner_type": "docker",
            "execution_log": f"Exit Code: {exit_code}\n\nSTDOUT:\n{raw_stdout}\n\nSTDERR:\n{raw_stderr}",
            "timestamp": patch.created_at
        }

    @classmethod
    def _record_failed_patch(
        cls,
        db: Session,
        session: RepairSession,
        user_id: int,
        file_path: str,
        code: str,
        status: str,
        summary: str,
        test_results: List[Dict[str, Any]],
        raw_log: str,
        runner_type: str
    ) -> Dict[str, Any]:
        original_code = WorkspaceManager.read_original_code(session.fixture_id, file_path)
        diff = WorkspaceManager.compute_diff(original_code, code, file_path)
        before_status = session.current_verification_status

        session.patch_attempts_count += 1
        session.current_verification_status = status.lower()
        session.updated_at = utcnow()

        patch = RepairPatch(
            repair_session_id=session.id,
            user_id=user_id,
            attempt_number=session.patch_attempts_count,
            file_path=file_path,
            original_code=original_code,
            proposed_code=code,
            diff=diff,
            verification_status=status,
            verification_output={
                "summary": summary,
                "tests": test_results,
                "log": raw_log,
                "runner_type": runner_type
            },
            created_at=utcnow()
        )
        db.add(patch)
        db.commit()
        db.refresh(patch)

        return {
            "patch_id": patch.id,
            "session_id": session.id,
            "attempt_number": patch.attempt_number,
            "verification_status": status,
            "summary": summary,
            "test_results": test_results,
            "before_status": before_status,
            "after_status": status,
            "diff": diff,
            "runner_type": runner_type,
            "execution_log": raw_log,
            "timestamp": patch.created_at
        }
