import os
import shutil
import subprocess
import json
import tempfile
import logging
from typing import Optional, List
from app.services.scanners.base import BaseScanner, ScannerResult, RawFinding
from app.services.scanners.docker_support import is_docker_available, is_docker_image_available

logger = logging.getLogger("proofforge.scanners.gitleaks")
DOCKER_IMAGE = "zricethezav/gitleaks:latest"

class GitleaksScanner(BaseScanner):
    @property
    def name(self) -> str:
        return "gitleaks"

    def _get_executable(self) -> Optional[str]:
        return shutil.which("gitleaks")

    def is_available(self) -> bool:
        return self._get_executable() is not None or is_docker_image_available(DOCKER_IMAGE)

    def get_version(self) -> Optional[str]:
        exe = self._get_executable()
        if exe:
            try:
                res = subprocess.run([exe, "version"], capture_output=True, text=True, timeout=10)
                return res.stdout.strip() if res.returncode == 0 else None
            except Exception:
                return None

        if is_docker_image_available(DOCKER_IMAGE):
            try:
                res = subprocess.run(
                    ["docker", "run", "--rm", DOCKER_IMAGE, "version"],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
                if res.returncode == 0:
                    ver = res.stdout.strip()
                    return f"{ver} (docker)"
            except Exception:
                return None
        return None

    def scan(self, repo_path: str) -> ScannerResult:
        if not self.is_available():
            return ScannerResult(
                scanner_name=self.name,
                status="scanner_unavailable",
                error_message="Gitleaks CLI binary not found in PATH on host system and Docker container image unavailable."
            )

        exe = self._get_executable()
        version = self.get_version()
        findings: List[RawFinding] = []
        abs_repo = os.path.abspath(repo_path)

        try:
            raw_data = None
            if exe:
                with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp_file:
                    report_path = tmp_file.name

                try:
                    cmd = [
                        exe,
                        "dir",
                        abs_repo,
                        "--report-format", "json",
                        "--report-path", report_path,
                        "--no-git"
                    ]
                    res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                    if os.path.exists(report_path) and os.path.getsize(report_path) > 0:
                        with open(report_path, "r", encoding="utf-8") as f:
                            raw_data = json.load(f)
                finally:
                    if os.path.exists(report_path):
                        try:
                            os.remove(report_path)
                        except OSError:
                            pass
            else:
                cmd = [
                    "docker",
                    "run",
                    "--rm",
                    "-v", f"{abs_repo}:/repo:ro",
                    DOCKER_IMAGE,
                    "dir",
                    "/repo",
                    "--report-format", "json",
                    "--report-path", "-",
                    "--no-banner",
                    "--log-level", "error"
                ]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                stdout = res.stdout.strip()
                if stdout:
                    try:
                        raw_data = json.loads(stdout)
                    except json.JSONDecodeError:
                        # Extract JSON portion if any preamble exists
                        start_idx = stdout.find("[")
                        end_idx = stdout.rfind("]")
                        if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                            raw_data = json.loads(stdout[start_idx:end_idx + 1])

            if raw_data and isinstance(raw_data, list):
                for item in raw_data:
                    raw_file = item.get("File", "")
                    rel_file = raw_file.replace(abs_repo, "").replace("/repo", "").lstrip("/\\")
                    rule_id = item.get("RuleID", "generic-api-key")
                    description = item.get("Description", "Potential secret or credential discovered in source.")
                    
                    # Never display plain secrets in snippet! Redact!
                    secret_val = item.get("Secret", "")
                    masked_snippet = f"Secret pattern matched: {rule_id} (length: {len(secret_val)}, redacted for security)"

                    findings.append(RawFinding(
                        title=f"Exposed Secret: {rule_id}",
                        description=description,
                        severity="critical",
                        category="security",
                        file_path=rel_file,
                        line_number=item.get("StartLine"),
                        line_end=item.get("EndLine"),
                        cwe_id="CWE-798",
                        scanner_name=self.name,
                        scanner_version=version,
                        scanner_rule_id=rule_id,
                        confidence="high",
                        code_snippet=masked_snippet,
                        risk_explanation="Hardcoded secrets or tokens committed to source code enable unauthorized access and privilege escalation.",
                        remediation="Immediately revoke and rotate the secret. Remove credential from source and store in environment variables or secret manager."
                    ))

            return ScannerResult(
                scanner_name=self.name,
                status="completed",
                version=version,
                findings=findings
            )
        except Exception as e:
            logger.error(f"Gitleaks scan failed: {e}")
            return ScannerResult(
                scanner_name=self.name,
                status="error",
                version=version,
                error_message=str(e)
            )
