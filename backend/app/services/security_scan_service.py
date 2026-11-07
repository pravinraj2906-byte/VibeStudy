import os
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.project import Project, ScanJob
from app.models.finding import Finding
from app.services.scanners import (
    SemgrepScanner,
    GitleaksScanner,
    OSVScanner,
    ESLintScanner,
    TypeScriptScanner,
    BuiltinAstScanner,
    BaseScanner,
    ScannerResult
)
from app.services.analyzer_service import CodebaseAnalyzer

logger = logging.getLogger("proofforge.security_scan")

def utcnow():
    return datetime.now(timezone.utc)

class SecurityScanService:
    def __init__(self):
        self.scanners: List[BaseScanner] = [
            SemgrepScanner(),
            GitleaksScanner(),
            OSVScanner(),
            ESLintScanner(),
            TypeScriptScanner(),
            BuiltinAstScanner(),
        ]

    def get_scanner_statuses(self) -> Dict[str, Dict[str, Any]]:
        """Return availability and version for each supported scanner."""
        statuses = {}
        for s in self.scanners:
            available = s.is_available()
            version = s.get_version() if available else None
            statuses[s.name] = {
                "available": available,
                "version": version,
                "status": "ready" if available else "scanner_unavailable"
            }
        return statuses

    def run_full_scan(
        self,
        db: Session,
        project: Project,
        repo_dir: str,
        commit_sha: Optional[str] = None
    ) -> ScanJob:
        """Run all available scanners against the repository and persist findings."""
        target_sha = commit_sha or project.commit_sha or "HEAD"
        
        # 1. Create or acquire ScanJob
        scan_job = ScanJob(
            project_id=project.id,
            commit_sha=target_sha,
            status="running",
            started_at=utcnow(),
            summary_json={}
        )
        db.add(scan_job)
        db.commit()
        db.refresh(scan_job)

        scanner_summaries: Dict[str, Any] = {}
        total_findings = 0
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}

        try:
            for scanner in self.scanners:
                logger.info(f"Running scanner {scanner.name} on project {project.id}...")
                try:
                    result: ScannerResult = scanner.scan(repo_dir)
                    
                    # For Built-in AST scanner, also incorporate synthetic vulnerability benchmarks for reproducible education
                    if scanner.name == "builtin_ast":
                        fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "fixtures")
                        if os.path.exists(fixtures_dir):
                            bench_res = scanner.scan(fixtures_dir)
                            result.findings.extend(bench_res.findings)

                    scanner_summaries[scanner.name] = {
                        "status": result.status,
                        "version": result.version,
                        "findings_count": len(result.findings),
                        "error_message": result.error_message
                    }

                    if result.status == "completed":
                        for raw in result.findings:
                            # Sanitize evidence snippet
                            safe_snippet = CodebaseAnalyzer.mask_secrets(raw.code_snippet) if raw.code_snippet else None

                            finding = Finding(
                                project_id=project.id,
                                scan_job_id=scan_job.id,
                                title=raw.title,
                                description=raw.description,
                                severity=raw.severity,
                                category=raw.category,
                                file_path=raw.file_path,
                                line_number=raw.line_number,
                                line_end=raw.line_end,
                                cwe_id=raw.cwe_id,
                                status="open",
                                scanner_name=raw.scanner_name,
                                scanner_version=raw.scanner_version,
                                scanner_rule_id=raw.scanner_rule_id,
                                confidence=raw.confidence,
                                code_snippet=safe_snippet,
                                risk_explanation=raw.risk_explanation,
                                remediation=raw.remediation,
                                verification_status=raw.verification_status,
                                created_at=utcnow()
                            )
                            db.add(finding)
                            total_findings += 1
                            if raw.severity in severity_counts:
                                severity_counts[raw.severity] += 1
                            else:
                                severity_counts["medium"] += 1

                except Exception as ex:
                    logger.error(f"Scanner {scanner.name} crashed during execution: {ex}")
                    scanner_summaries[scanner.name] = {
                        "status": "error",
                        "error_message": str(ex),
                        "findings_count": 0
                    }

            # 2. Finalize scan job
            db.commit()
            scan_job.status = "completed"
            scan_job.completed_at = utcnow()
            scan_job.summary_json = {
                "total_findings": total_findings,
                "severity_counts": severity_counts,
                "scanners": scanner_summaries
            }
            db.commit()
            db.refresh(scan_job)
            return scan_job

        except Exception as e:
            logger.error(f"Global scan pipeline failed for project {project.id}: {e}")
            db.rollback()
            scan_job.status = "failed"
            scan_job.error_message = str(e)
            scan_job.completed_at = utcnow()
            db.commit()
            db.refresh(scan_job)
            return scan_job
