import os
import shutil
import subprocess
import json
import logging
from typing import Optional, List
from app.services.scanners.base import BaseScanner, ScannerResult, RawFinding
from app.services.scanners.docker_support import is_docker_available, is_docker_image_available

logger = logging.getLogger("proofforge.scanners.osv")
DOCKER_IMAGE = "ghcr.io/google/osv-scanner:latest"

class OSVScanner(BaseScanner):
    @property
    def name(self) -> str:
        return "osv-scanner"

    def _get_executable(self) -> Optional[str]:
        return shutil.which("osv-scanner")

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
                    ["docker", "run", "--rm", DOCKER_IMAGE, "--version"],
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
                error_message="OSV-Scanner binary not found in PATH on host system and Docker container image unavailable."
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
                    "--format", "json",
                    "-r", abs_repo
                ]
            else:
                cmd = [
                    "docker",
                    "run",
                    "--rm",
                    "-v", f"{abs_repo}:/src:ro",
                    DOCKER_IMAGE,
                    "-r",
                    "--format", "json",
                    "/src"
                ]

            res = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
            output = res.stdout
            
            if output:
                # Find JSON block in stdout if preamble exists
                json_str = output
                start_idx = output.find("{")
                end_idx = output.rfind("}")
                if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                    json_str = output[start_idx:end_idx + 1]

                try:
                    data = json.loads(json_str)
                    results = data.get("results", [])
                    for res_entry in results:
                        source = res_entry.get("source", {}).get("path", "")
                        rel_file = source.replace(abs_repo, "").replace("/src", "").lstrip("/\\") or "package.json"
                        
                        packages = res_entry.get("packages", [])
                        for pkg_entry in packages:
                            pkg_info = pkg_entry.get("package", {})
                            pkg_name = pkg_info.get("name", "dependency")
                            pkg_ver = pkg_info.get("version", "unknown")
                            vulns = pkg_entry.get("vulnerabilities", [])
                            
                            for vuln in vulns:
                                vuln_id = vuln.get("id", "OSV-VULN")
                                summary = vuln.get("summary") or vuln.get("details", "")[:120]
                                aliases = vuln.get("aliases", [])
                                cve = aliases[0] if aliases else vuln_id
                                
                                findings.append(RawFinding(
                                    title=f"Vulnerable Dependency: {pkg_name}@{pkg_ver} ({cve})",
                                    description=summary or f"Known vulnerability in {pkg_name} version {pkg_ver}.",
                                    severity="high",
                                    category="security",
                                    file_path=rel_file,
                                    line_number=1,
                                    cwe_id="CWE-1395",
                                    scanner_name=self.name,
                                    scanner_version=version,
                                    scanner_rule_id=vuln_id,
                                    confidence="high",
                                    code_snippet=f'"{pkg_name}": "{pkg_ver}"',
                                    risk_explanation=f"Package {pkg_name} has known published vulnerability {vuln_id}.",
                                    remediation=f"Upgrade {pkg_name} to a secure, patched version."
                                ))

                    return ScannerResult(
                        scanner_name=self.name,
                        status="completed",
                        version=version,
                        findings=findings
                    )
                except json.JSONDecodeError as jde:
                    logger.debug(f"OSV-Scanner output was not JSON: {jde}")
                    # If message says "No package sources found", it's a clean completion
                    if "No package sources found" in output:
                        return ScannerResult(
                            scanner_name=self.name,
                            status="completed",
                            version=version,
                            findings=[]
                        )
                    return ScannerResult(
                        scanner_name=self.name,
                        status="error",
                        version=version,
                        error_message=f"Invalid JSON from OSV-Scanner: {jde}"
                    )

            # If no stdout but returncode indicated no package sources
            if "No package sources found" in res.stderr:
                return ScannerResult(scanner_name=self.name, status="completed", version=version, findings=[])

            return ScannerResult(scanner_name=self.name, status="completed", version=version, findings=[])

        except Exception as e:
            logger.error(f"OSV-Scanner scan failed: {e}")
            return ScannerResult(
                scanner_name=self.name,
                status="error",
                version=version,
                error_message=str(e)
            )
