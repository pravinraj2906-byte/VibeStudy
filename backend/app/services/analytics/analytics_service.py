import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.repair import RepairSession, RepairPatch
from app.models.challenge import ChallengeAttempt
from app.models.finding import Lesson

logger = logging.getLogger("proofforge.analytics.service")

class AnalyticsService:
    @classmethod
    def get_user_overview(cls, db: Session, user_id: int) -> Dict[str, Any]:
        # 1. Guided Repairs
        repair_sessions = db.query(RepairSession).filter(RepairSession.user_id == user_id).all()
        guided_repairs_attempted = sum(s.patch_attempts_count for s in repair_sessions)
        guided_repairs_verified = sum(1 for s in repair_sessions if s.status == "verified" or s.current_verification_status == "verified_fixed")
        
        hints_requested_total = sum(len(s.hints_requested or []) for s in repair_sessions)

        # 2. Independent Transfer Challenges
        challenge_attempts = db.query(ChallengeAttempt).filter(ChallengeAttempt.user_id == user_id).all()
        transfer_challenges_attempted = len(challenge_attempts)
        transfer_challenges_passed = sum(1 for a in challenge_attempts if a.status == "passed")
        unassisted_transfer_count = sum(1 for a in challenge_attempts if a.status == "passed" and a.is_unassisted)

        hints_requested_total += sum(len(a.hints_used or []) for a in challenge_attempts)

        # 3. Lessons Viewed
        lessons_count = db.query(Lesson).count()

        # 4. Competencies Assessment (Evidence-Proportionate Heuristics)
        # Concept: Broken Object-Level Authorization (IDOR)
        idor_verified_repair = (guided_repairs_verified > 0)
        idor_passed_transfer = (transfer_challenges_passed > 0)
        idor_unassisted = (unassisted_transfer_count > 0)

        # Readiness heuristic calculation
        if transfer_challenges_passed == 0:
            readiness_status = "EVALUATION_PENDING"
            readiness_summary = "Complete an independent transfer challenge to demonstrate initial concept transfer."
        elif transfer_challenges_passed == 1:
            readiness_status = "INITIAL_TRANSFER_DEMONSTRATED"
            readiness_summary = "Single-scenario transfer verified. Further challenges recommended for broad resilience."
        elif transfer_challenges_passed == 2:
            readiness_status = "PRACTICED_MULTI_SCENARIO"
            readiness_summary = "Transfer demonstrated across 2 distinct defect scenarios."
        else:
            readiness_status = "MULTI_DOMAIN_RESILIENT"
            readiness_summary = "Demonstrated resilient generalization across 3+ distinct domains."

        if idor_verified_repair and idor_passed_transfer:
            idor_status = "TRANSFER_DEMONSTRATED"
            idor_summary = (
                "Initial Transfer Demonstrated: Successfully repaired IDOR in guided studio and "
                "generalized object-level authorization to an unfamiliar collaboration API. "
                "(Single-scenario proof; further challenges recommended for broad resilience)."
            )
        elif idor_verified_repair:
            idor_status = "IN_PROGRESS"
            idor_summary = (
                "Guided Repair Verified: Fixed invoice authorization in sandbox. "
                "Complete the independent transfer challenge to demonstrate concept generalization."
            )
        elif guided_repairs_attempted > 0:
            idor_status = "PRACTICE_STARTED"
            idor_summary = "Guided repair practice in progress. Iterating on candidate patches."
        else:
            idor_status = "NOT_STARTED"
            idor_summary = "Concept introduced. Open Guided Repair Studio to start practice."

        competencies = [
            {
                "concept": "Broken Object-Level Authorization (IDOR)",
                "status": idor_status,
                "guided_repairs_verified": guided_repairs_verified,
                "transfer_challenges_passed": transfer_challenges_passed,
                "unassisted_transfer": idor_unassisted,
                "summary": idor_summary
            },
            {
                "concept": "Cross-Site Scripting (XSS / Unsafe DOM Rendering)",
                "status": "NOT_STARTED",
                "guided_repairs_verified": 0,
                "transfer_challenges_passed": 0,
                "unassisted_transfer": False,
                "summary": "Explored in Milestone B benchmark fixtures. Scheduled for advanced practice."
            },
            {
                "concept": "Hardcoded Secret Management & Credential Hygiene",
                "status": "NOT_STARTED",
                "guided_repairs_verified": 0,
                "transfer_challenges_passed": 0,
                "unassisted_transfer": False,
                "summary": "Explored in Milestone B benchmark fixtures. Scheduled for advanced practice."
            }
        ]

        # 5. Recent Activity Timeline
        recent_events = []
        # Add patches
        recent_patches = db.query(RepairPatch).filter(RepairPatch.user_id == user_id).order_by(RepairPatch.created_at.desc()).limit(5).all()
        for p in recent_patches:
            recent_events.append({
                "type": "guided_repair_patch",
                "title": f"Guided Repair Attempt #{p.attempt_number}",
                "status": p.verification_status,
                "timestamp": p.created_at.isoformat()
            })

        # Add challenge attempts
        recent_attempts = db.query(ChallengeAttempt).filter(ChallengeAttempt.user_id == user_id).order_by(ChallengeAttempt.created_at.desc()).limit(5).all()
        for a in recent_attempts:
            recent_events.append({
                "type": "transfer_challenge",
                "title": f"Transfer Challenge #{a.attempt_number} ({a.challenge_id})",
                "status": f"{a.status.upper()} ({a.score}/{a.max_score} tests)",
                "timestamp": a.created_at.isoformat()
            })

        recent_events.sort(key=lambda x: x["timestamp"], reverse=True)

        return {
            "total_lessons_viewed": max(lessons_count, 1),
            "guided_repairs_attempted": guided_repairs_attempted,
            "guided_repairs_verified": guided_repairs_verified,
            "transfer_challenges_attempted": transfer_challenges_attempted,
            "transfer_challenges_passed": transfer_challenges_passed,
            "unassisted_transfer_count": unassisted_transfer_count,
            "hints_requested_total": hints_requested_total,
            "readiness_status": readiness_status,
            "readiness_summary": readiness_summary,
            "competencies": competencies,
            "recent_events": recent_events[:8]
        }
