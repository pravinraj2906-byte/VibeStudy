import os
import shutil
import subprocess
import json
import logging
from typing import Optional, List
from app.services.scanners.base import BaseScanner, ScannerResult, RawFinding
from app.services.scanners.docker_support import is_docker_available, is_docker_image_available

logger = logging.getLogger("proofforge.scanners.semgrep")
DOCKER_IMAGE = "semgrep/semgrep:latest"

class SemgrepScanner(BaseScanner):
    @property
    def name(self) -> str:
        return "semgrep"

    def _get_executable(self) -> Optional[str]:
        return shutil.which("semgrep")

    def _use_docker(self) -> bool:
        return self._get_executable() is None and is_docker_image_available(DOCKER_IMAGE)

    def is_available(self) -> bool:
        return self._get_executable() is not None or is_docker_image_available(DOCKER_IMAGE)

    def get_version(self) -> Optional[str]:
        exe = self._get_executable()
        if exe:
            try:
                res = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=10)
                return res.stdout.strip() if res.returncode == 0 else None
            except Exception:
                return None
        
        if is_docker_image_available(DOCKER_IMAGE):
            try:
                res = subprocess.run(
                    ["docker", "run", "--rm", DOCKER_IMAGE, "semgrep", "--version"],
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
                error_message="Semgrep CLI binary not found in PATH on host system and Docker container image unavailable."
            )

        exe = self._get_executable()
        version = self.get_version()
        findings: List[RawFinding] = []
        abs_repo = os.path.abspath(repo_path)

        try:
            if exe:
                cmd = [
                    exe,
                    "scan",
                    "--json",
                    "--config", "auto",
                    "--quiet",
                    "--no-git-ignore",
                    abs_repo
                ]
            else:
                cmd = [
                    "docker",
                    "run",
                    "--rm",
                    "-v", f"{abs_repo}:/src:ro",
                    DOCKER_IMAGE,
                    "semgrep",
                    "scan",
                    "--json",
                    "--config", "auto",
                    "--quiet",
                    "--no-git-ignore",
                    "/src"
                ]

            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            # Semgrep exits with 0 on no findings, or 0/1 depending on findings and error flags
            if res.stdout:
                try:
                    data = json.loads(res.stdout)
                    results = data.get("results", [])
                    for item in results:
                        check_id = item.get("check_id", "semgrep.rule")
                        extra = item.get("extra", {})
                        meta = extra.get("metadata", {})
                        severity_raw = extra.get("severity", "WARNING").upper()
                        
                        severity_map = {
                            "ERROR": "high",
                            "WARNING": "medium",
                            "INFO": "low",
                            "CRITICAL": "critical"
                        }
                        severity = severity_map.get(severity_raw, "medium")

                        cwes = meta.get("cwe", [])
                        cwe_id = cwes[0] if isinstance(cwes, list) and cwes else (cwes if isinstance(cwes, str) else None)
                        if isinstance(cwe_id, str) and ":" in cwe_id:
                            cwe_id = cwe_id.split(":")[0].strip()

                        raw_file = item.get("path", "")
                        # Relativize path
                        rel_file = raw_file.replace(abs_repo, "").replace("/src", "").lstrip("/\\")

                        findings.append(RawFinding(
                            title=meta.get("shortDescription") or check_id.split(".")[-1].replace("-", " ").title(),
                            description=extra.get("message", "Semgrep security finding detected."),
                            severity=severity,
                            category="security",
                            file_path=rel_file,
                            line_number=item.get("start", {}).get("line"),
                            line_end=item.get("end", {}).get("line"),
                            cwe_id=cwe_id or "CWE-1000",
                            scanner_name=self.name,
                            scanner_version=version,
                            scanner_rule_id=check_id,
                            confidence="high" if extra.get("confidence") == "HIGH" else "medium",
                            code_snippet=extra.get("lines", ""),
                            risk_explanation=meta.get("impact", "Potential security weakness identified by static analysis rule."),
                            remediation=meta.get("fix", "Review finding logic and apply secure coding pattern.")
                        ))

                    return ScannerResult(
                        scanner_name=self.name,
                        status="completed",
                        version=version,
                        findings=findings
                    )
                except json.JSONDecodeError as jde:
                    logger.error(f"Failed to parse Semgrep JSON output: {jde}")
                    return ScannerResult(
                        scanner_name=self.name,
                        status="error",
                        version=version,
                        error_message=f"Invalid JSON from Semgrep: {jde}"
                    )

            return ScannerResult(scanner_name=self.name, status="completed", version=version, findings=[])

        except Exception as e:
            logger.error(f"Semgrep scan failed: {e}")
            return ScannerResult(
                scanner_name=self.name,
                status="error",
                version=version,
                error_message=str(e)
            )
