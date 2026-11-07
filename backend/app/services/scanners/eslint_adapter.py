import shutil
import subprocess
import json
import os
import logging
from typing import Optional, List
from app.services.scanners.base import BaseScanner, ScannerResult, RawFinding

logger = logging.getLogger("proofforge.scanners.eslint")

class ESLintScanner(BaseScanner):
    @property
    def name(self) -> str:
        return "eslint"

    def _get_executable(self) -> Optional[str]:
        # Check system PATH first
        exe = shutil.which("eslint") or shutil.which("eslint.cmd")
        if exe:
            return exe
        
        # Check frontend local node_modules
        frontend_eslint = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "frontend", "node_modules", ".bin", "eslint.cmd")
        if os.path.exists(frontend_eslint):
            return frontend_eslint
            
        return None

    def is_available(self) -> bool:
        from app.core.config import settings
        return settings.CODE_EXECUTION_ENABLED and self._get_executable() is not None

    def get_version(self) -> Optional[str]:
        exe = self._get_executable()
        if not exe:
            return None
        try:
            res = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=10, shell=True)
            return res.stdout.strip() if res.returncode == 0 else None
        except Exception:
            return None

    def scan(self, repo_path: str) -> ScannerResult:
        if not self.is_available():
            return ScannerResult(
                scanner_name=self.name,
                status="scanner_unavailable",
                error_message="ESLint binary not installed in environment or node_modules."
            )

        exe = self._get_executable()
        version = self.get_version()
        findings: List[RawFinding] = []

        try:
            # Run eslint with json formatter
            cmd = [
                exe,
                repo_path,
                "-f", "json",
                "--ext", ".js,.jsx,.ts,.tsx",
                "--no-error-on-unmatched-pattern"
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60, shell=True)
            output = res.stdout

            if output:
                try:
                    data = json.loads(output)
                    for file_entry in data:
                        raw_file = file_entry.get("filePath", "")
                        rel_file = raw_file.replace(repo_path, "").lstrip("/\\")
                        messages = file_entry.get("messages", [])

                        for msg in messages:
                            rule_id = msg.get("ruleId") or "eslint-diagnostic"
                            severity_code = msg.get("severity", 1)  # 1 = warn, 2 = error
                            severity = "high" if severity_code == 2 else "medium"
                            message_text = msg.get("message", "ESLint diagnostic reported.")

                            # Categorize
                            is_security = any(k in rule_id.lower() for k in ["security", "danger", "eval", "xss", "inject", "token", "auth"])
                            category = "security" if is_security else "code_quality"

                            findings.append(RawFinding(
                                title=f"ESLint: {rule_id}",
                                description=message_text,
                                severity=severity if is_security else "low",
                                category=category,
                                file_path=rel_file,
                                line_number=msg.get("line"),
                                line_end=msg.get("endLine"),
                                cwe_id="CWE-710" if not is_security else "CWE-79",
                                scanner_name=self.name,
                                scanner_version=version,
                                scanner_rule_id=rule_id,
                                confidence="high",
                                code_snippet=None,
                                risk_explanation="Code quality or security diagnostic flagged by static linting rules.",
                                remediation="Adhere to standard TypeScript/JavaScript best practices to resolve lint diagnostics."
                            ))

                    return ScannerResult(
                        scanner_name=self.name,
                        status="completed",
                        version=version,
                        findings=findings
                    )
                except json.JSONDecodeError as jde:
                    logger.warning(f"Could not parse ESLint JSON output: {jde}")
                    return ScannerResult(
                        scanner_name=self.name,
                        status="error",
                        version=version,
                        error_message=f"JSON parse error: {jde}"
                    )

            return ScannerResult(scanner_name=self.name, status="completed", version=version, findings=[])

        except Exception as e:
            logger.error(f"ESLint scan failed: {e}")
            return ScannerResult(
                scanner_name=self.name,
                status="error",
                version=version,
                error_message=str(e)
            )
