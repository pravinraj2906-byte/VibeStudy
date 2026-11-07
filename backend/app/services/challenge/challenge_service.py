import os
import sys
import ast
import json
import shutil
import difflib
import logging
import secrets
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.challenge import ChallengeDefinition, ChallengeAttempt
from app.services.scanners.docker_support import is_docker_available

logger = logging.getLogger("proofforge.challenge.service")

FIXTURES_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "fixtures")
)
WORKSPACES_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "storage", "workspaces")
)
DOCKER_IMAGE = "proofforge-sandbox:latest"

def utcnow():
    return datetime.now(timezone.utc)

class ChallengeService:
    @classmethod
    def seed_challenges(cls, db: Session):
        """Seed initial versioned challenge definitions."""
        flagship_id = "transfer-task-auth-v1"
        existing = db.query(ChallengeDefinition).filter(ChallengeDefinition.challenge_id == flagship_id).first()
        if not existing:
            challenge = ChallengeDefinition(
                challenge_id=flagship_id,
                concept="Broken Object-Level Authorization (IDOR)",
                title="Cross-Organization Task Access Prevention",
                domain="Project Management & Task Collaboration API",
                difficulty="Intermediate",
                scenario=(
                    "You are maintaining an enterprise task collaboration microservice. "
                    "A critical vulnerability was reported: users from tenant Organization Beta "
                    "are able to read confidential tasks belonging to Organization Alpha through the "
                    "GET /organizations/{org_id}/tasks/{task_id} route. "
                    "Your mission is to independently implement proper object-level authorization "
                    "so that cross-organization access is strictly rejected with HTTP 403 Forbidden, "
                    "while legitimate access for authorized members is fully preserved."
                ),
                starter_files_dir="challenge_task_auth",
                editable_file="task_api.py",
                hidden_test_script="grader.py",
                created_at=utcnow()
            )
            db.add(challenge)
            db.commit()

    @classmethod
    def list_challenges(cls, db: Session) -> List[Dict[str, Any]]:
        cls.seed_challenges(db)
        challenges = db.query(ChallengeDefinition).all()
        return [
            {
                "challenge_id": c.challenge_id,
                "concept": c.concept,
                "title": c.title,
                "domain": c.domain,
                "difficulty": c.difficulty,
                "scenario": c.scenario,
                "editable_file": c.editable_file
            }
            for c in challenges
        ]

    @classmethod
    def get_challenge_detail(cls, db: Session, challenge_id: str) -> Dict[str, Any]:
        cls.seed_challenges(db)
        c = db.query(ChallengeDefinition).filter(ChallengeDefinition.challenge_id == challenge_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Challenge not found.")

        starter_path = os.path.join(FIXTURES_ROOT, c.starter_files_dir, c.editable_file)
        if not os.path.exists(starter_path):
            raise HTTPException(status_code=500, detail="Challenge starter template missing.")

        with open(starter_path, "r", encoding="utf-8") as f:
            starter_code = f.read()

        return {
            "challenge_id": c.challenge_id,
            "concept": c.concept,
            "title": c.title,
            "domain": c.domain,
            "difficulty": c.difficulty,
            "scenario": c.scenario,
            "editable_file": c.editable_file,
            "starter_code": starter_code,
            "original_code": starter_code,
            "rules": [
                "Unassisted attempts: Solve the challenge without requesting hints to demonstrate full engineering mastery.",
                "Deterministic verification: Solutions are graded against an authoritative test suite checking positive, negative, and edge cases.",
                "No hardcoding: Ensure your check generalizes across all organizations and task identifiers.",
                "No regressions: Legitimate tenant requests must continue to return HTTP 200 OK."
            ]
        }

    @classmethod
    def start_or_resume_attempt(cls, db: Session, challenge_id: str, user_id: int) -> Dict[str, Any]:
        cls.seed_challenges(db)
        c = db.query(ChallengeDefinition).filter(ChallengeDefinition.challenge_id == challenge_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Challenge not found.")

        # Check existing in-progress attempt
        attempt = db.query(ChallengeAttempt).filter(
            ChallengeAttempt.challenge_id == challenge_id,
            ChallengeAttempt.user_id == user_id,
            ChallengeAttempt.status == "in_progress"
        ).order_by(ChallengeAttempt.attempt_number.desc()).first()

        if not attempt:
            # Create new attempt
            count = db.query(ChallengeAttempt).filter(
                ChallengeAttempt.challenge_id == challenge_id,
                ChallengeAttempt.user_id == user_id
            ).count()

            attempt = ChallengeAttempt(
                challenge_id=challenge_id,
                user_id=user_id,
                attempt_number=count + 1,
                status="in_progress",
                is_unassisted=True,
                hints_used=[],
                workspace_dir="",
                score=0,
                max_score=6,
                created_at=utcnow()
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)

            # Initialize attempt workspace
            workspace_dir = os.path.join(WORKSPACES_ROOT, f"challenge_{attempt.id}")
            os.makedirs(workspace_dir, exist_ok=True)

            # Copy ONLY student-facing starter files (strictly excluding hidden grader tests)
            fixture_dir = os.path.join(FIXTURES_ROOT, c.starter_files_dir)
            for item in os.listdir(fixture_dir):
                if item == c.hidden_test_script or item.startswith("grader") or item.startswith("test_"):
                    continue
                s = os.path.join(fixture_dir, item)
                d = os.path.join(workspace_dir, item)
                if not os.path.isdir(s):
                    shutil.copy2(s, d)

            attempt.workspace_dir = workspace_dir
            db.commit()
            db.refresh(attempt)

        if not attempt.workspace_dir or not os.path.exists(attempt.workspace_dir) or not os.path.exists(os.path.join(attempt.workspace_dir, c.editable_file)):
            workspace_dir = os.path.join(WORKSPACES_ROOT, f"challenge_{attempt.id}")
            os.makedirs(workspace_dir, exist_ok=True)
            fixture_dir = os.path.join(FIXTURES_ROOT, c.starter_files_dir)
            for item in os.listdir(fixture_dir):
                if item == c.hidden_test_script or item.startswith("grader") or item.startswith("test_"):
                    continue
                s = os.path.join(fixture_dir, item)
                d = os.path.join(workspace_dir, item)
                if not os.path.isdir(s):
                    shutil.copy2(s, d)
            attempt.workspace_dir = workspace_dir
            db.commit()
            db.refresh(attempt)

        # Defense-in-depth: Ensure no hidden grader script exists inside the student practice workspace
        leaked_grader = os.path.join(attempt.workspace_dir, c.hidden_test_script)
        if os.path.exists(leaked_grader):
            try:
                os.remove(leaked_grader)
            except OSError:
                pass

        target_file = os.path.join(attempt.workspace_dir, c.editable_file)
        with open(target_file, "r", encoding="utf-8") as f:
            current_code = f.read()

        orig_file = os.path.join(FIXTURES_ROOT, c.starter_files_dir, c.editable_file)
        with open(orig_file, "r", encoding="utf-8") as f:
            original_code = f.read()

        diff = "".join(difflib.unified_diff(
            original_code.splitlines(keepends=True),
            current_code.splitlines(keepends=True),
            fromfile=f"a/{c.editable_file}",
            tofile=f"b/{c.editable_file}",
            lineterm=""
        ))

        return {
            "id": attempt.id,
            "challenge_id": attempt.challenge_id,
            "user_id": attempt.user_id,
            "attempt_number": attempt.attempt_number,
            "status": attempt.status,
            "is_unassisted": attempt.is_unassisted,
            "hints_used": attempt.hints_used or [],
            "editable_file": c.editable_file,
            "current_code": current_code,
            "diff": diff,
            "score": attempt.score,
            "max_score": attempt.max_score,
            "feedback": attempt.feedback,
            "created_at": attempt.created_at,
            "completed_at": attempt.completed_at
        }

    @classmethod
    def save_draft(cls, db: Session, attempt_id: int, user_id: int, code: str) -> Dict[str, Any]:
        attempt = db.query(ChallengeAttempt).filter(
            ChallengeAttempt.id == attempt_id,
            ChallengeAttempt.user_id == user_id
        ).first()
        if not attempt:
            raise HTTPException(status_code=404, detail="Challenge attempt not found or unauthorized.")

        c = db.query(ChallengeDefinition).filter(ChallengeDefinition.challenge_id == attempt.challenge_id).first()
        target_file = os.path.join(attempt.workspace_dir, c.editable_file)
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(code)

        attempt.submitted_code = code
        db.commit()

        orig_file = os.path.join(FIXTURES_ROOT, c.starter_files_dir, c.editable_file)
        with open(orig_file, "r", encoding="utf-8") as f:
            orig = f.read()

        diff = "".join(difflib.unified_diff(
            orig.splitlines(keepends=True),
            code.splitlines(keepends=True),
            fromfile=f"a/{c.editable_file}",
            tofile=f"b/{c.editable_file}",
            lineterm=""
        ))
        attempt.diff = diff
        db.commit()

        return {"saved": True, "attempt_id": attempt_id, "diff": diff}

    @classmethod
    def request_hint(cls, db: Session, attempt_id: int, user_id: int) -> Dict[str, Any]:
        attempt = db.query(ChallengeAttempt).filter(
            ChallengeAttempt.id == attempt_id,
            ChallengeAttempt.user_id == user_id
        ).first()
        if not attempt:
            raise HTTPException(status_code=404, detail="Challenge attempt not found.")

        # Requesting a hint marks attempt as assisted
        attempt.is_unassisted = False
        hints = list(attempt.hints_used or [])
        hints.append(1)
        attempt.hints_used = hints
        db.commit()

        return {
            "attempt_id": attempt.id,
            "is_unassisted": False,
            "hint": "Check the task's `org_id` attribute against the caller's authenticated `x_org_id` header. If they don't match, raise `HTTPException(status_code=403, detail='Cross-organization access forbidden')`."
        }

    @classmethod
    def submit_and_grade(cls, db: Session, attempt_id: int, user_id: int, code: str) -> Dict[str, Any]:
        attempt = db.query(ChallengeAttempt).filter(
            ChallengeAttempt.id == attempt_id,
            ChallengeAttempt.user_id == user_id
        ).first()
        if not attempt:
            raise HTTPException(status_code=404, detail="Challenge attempt not found.")

        c = db.query(ChallengeDefinition).filter(ChallengeDefinition.challenge_id == attempt.challenge_id).first()
        target_file = os.path.join(attempt.workspace_dir, c.editable_file)

        # 1. Syntax check
        try:
            ast.parse(code)
        except SyntaxError as e:
            attempt.status = "failed"
            attempt.score = 0
            attempt.feedback = f"Syntax error at line {e.lineno}: {e.msg}"
            attempt.completed_at = utcnow()
            db.commit()
            return {
                "attempt_id": attempt.id,
                "challenge_id": attempt.challenge_id,
                "status": "failed",
                "is_unassisted": attempt.is_unassisted,
                "score": 0,
                "max_score": 6,
                "passed_all": False,
                "test_results": [{
                    "name": "Syntax & Import Check",
                    "passed": False,
                    "description": "Code failed Python syntax parsing.",
                    "details": str(e)
                }],
                "feedback": f"Syntax error at line {e.lineno}: {e.msg}",
                "runner_type": "pre_execution_ast_parser",
                "completed_at": attempt.completed_at
            }

        # 2. Write code
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(code)

        orig_file = os.path.join(FIXTURES_ROOT, c.starter_files_dir, c.editable_file)
        with open(orig_file, "r", encoding="utf-8") as f:
            orig = f.read()

        diff = "".join(difflib.unified_diff(
            orig.splitlines(keepends=True),
            code.splitlines(keepends=True),
            fromfile=f"a/{c.editable_file}",
            tofile=f"b/{c.editable_file}",
            lineterm=""
        ))
        attempt.submitted_code = code
        attempt.diff = diff

        # 3. Docker Fail-Closed Gate
        if not is_docker_available():
            attempt.status = "failed"
            attempt.feedback = "Docker isolation unavailable. Cannot safely grade untrusted learner code."
            attempt.completed_at = utcnow()
            db.commit()
            return {
                "attempt_id": attempt.id,
                "challenge_id": attempt.challenge_id,
                "status": "failed",
                "is_unassisted": attempt.is_unassisted,
                "score": 0,
                "max_score": 6,
                "passed_all": False,
                "test_results": [],
                "feedback": "Execution blocked: Docker isolation is required for grading.",
                "runner_type": "fail_closed_policy",
                "completed_at": attempt.completed_at
            }

        # 4. Grade inside Docker with separated student vs grader mounts and signature token
        workspace_dir = os.path.abspath(attempt.workspace_dir)
        fixture_dir = os.path.abspath(os.path.join(FIXTURES_ROOT, c.starter_files_dir))
        grader_token = secrets.token_hex(24)

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
            "-v", f"{workspace_dir}:/student_workspace:ro",
            "-v", f"{fixture_dir}:/grader_suite:ro",
            "-w", "/grader_suite",
            DOCKER_IMAGE,
            "python", c.hidden_test_script,
            "--student-dir", "/student_workspace",
            "--token", grader_token
        ]

        logger.info(f"Running hidden grader in container for challenge attempt {attempt.id}...")
        try:
            proc = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=25)
            raw_stdout = proc.stdout.strip()
            raw_stderr = proc.stderr.strip()
        except Exception as ex:
            attempt.status = "failed"
            attempt.feedback = f"Container grader error: {ex}"
            attempt.completed_at = utcnow()
            db.commit()
            return {
                "attempt_id": attempt.id,
                "challenge_id": attempt.challenge_id,
                "status": "failed",
                "is_unassisted": attempt.is_unassisted,
                "score": 0,
                "max_score": 6,
                "passed_all": False,
                "test_results": [],
                "feedback": f"Execution failed: {ex}",
                "runner_type": "docker",
                "completed_at": attempt.completed_at
            }

        # 5. Parse test result with signed token verification (forgery defense)
        score = 0
        max_score = 6
        status = "failed"
        passed_all = False
        tests = []
        feedback = raw_stderr or raw_stdout

        token_start = f"<<<PROOFFORGE_GRADER_TOKEN_START:{grader_token}>>>"
        token_end = f"<<<PROOFFORGE_GRADER_TOKEN_END:{grader_token}>>>"

        try:
            if token_start in raw_stdout and token_end in raw_stdout:
                start_idx = raw_stdout.index(token_start) + len(token_start)
                end_idx = raw_stdout.index(token_end)
                payload_str = raw_stdout[start_idx:end_idx].strip()
                data = json.loads(payload_str)
                status = data.get("status", "failed")
                score = data.get("score", 0)
                max_score = data.get("max_score", 6)
                passed_all = data.get("passed_all", False)
                tests = data.get("tests", [])
                feedback = data.get("feedback", "")
            else:
                # Fallback parse check: Reject forged passes if token missing
                start_idx = raw_stdout.find("{")
                end_idx = raw_stdout.rfind("}")
                if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                    data = json.loads(raw_stdout[start_idx:end_idx + 1])
                    if data.get("status") == "passed":
                        logger.warning("Rejecting forged challenge evaluation output without signature token.")
                        status = "failed"
                        feedback = "Security validation failed: Unsigned or forged grader output detected."
                    else:
                        status = data.get("status", "failed")
                        score = data.get("score", 0)
                        max_score = data.get("max_score", 6)
                        tests = data.get("tests", [])
                        feedback = data.get("feedback", "")
                else:
                    feedback = "Grader produced invalid or unparseable output."
        except Exception as e:
            logger.warning(f"Grader output parse error: {e}")

        attempt.status = status
        attempt.score = score
        attempt.max_score = max_score
        attempt.test_results = tests
        attempt.feedback = feedback
        attempt.completed_at = utcnow()
        db.commit()

        return {
            "attempt_id": attempt.id,
            "challenge_id": attempt.challenge_id,
            "status": status,
            "is_unassisted": attempt.is_unassisted,
            "score": score,
            "max_score": max_score,
            "passed_all": passed_all,
            "test_results": tests,
            "feedback": feedback,
            "runner_type": "docker",
            "completed_at": attempt.completed_at
        }
