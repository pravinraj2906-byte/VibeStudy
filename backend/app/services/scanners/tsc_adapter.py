import shutil
import subprocess
import os
import re
import logging
from typing import Optional, List
from app.services.scanners.base import BaseScanner, ScannerResult, RawFinding

logger = logging.getLogger("proofforge.scanners.tsc")

class TypeScriptScanner(BaseScanner):
    @property
    def name(self) -> str:
        return "tsc"

    def _get_executable(self) -> Optional[str]:
        exe = shutil.which("tsc") or shutil.which("tsc.cmd")
        if exe:
            return exe
        
        frontend_tsc = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "frontend", "node_modules", ".bin", "tsc.cmd")
        if os.path.exists(frontend_tsc):
            return frontend_tsc
            
        return None

    def is_available(self) -> bool:
        return self._get_executable() is not None

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
                error_message="TypeScript compiler (tsc) not found in PATH or node_modules."
            )

        exe = self._get_executable()
        version = self.get_version()
        findings: List[RawFinding] = []

        try:
            # Check if repo has tsconfig.json or ts files
            has_ts = False
            for root, _, files in os.walk(repo_path):
                if any(f.endswith((".ts", ".tsx")) for f in files):
                    has_ts = True
                    break
            
            if not has_ts:
                return ScannerResult(
                    scanner_name=self.name,
                    status="completed",
                    version=version,
                    findings=[]
                )

            cmd = [
                exe,
                "--noEmit",
                "--pretty", "false"
            ]
            res = subprocess.run(cmd, cwd=repo_path, capture_output=True, text=True, timeout=60, shell=True)
            output = res.stdout + "\n" + res.stderr

            # Parse lines like: src/App.tsx(12,5): error TS2322: Type 'string' is not assignable to type 'number'.
            pattern = re.compile(r"^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$", re.MULTILINE)
            for match in pattern.finditer(output):
                file_rel = match.group(1).replace(repo_path, "").lstrip("/\\")
                line_no = int(match.group(2))
                severity_type = match.group(4)
                rule_id = match.group(5)
                msg = match.group(6)

                findings.append(RawFinding(
                    title=f"TypeScript: {rule_id}",
                    description=msg,
                    severity="medium" if severity_type == "error" else "low",
                    category="code_quality",
                    file_path=file_rel,
                    line_number=line_no,
                    cwe_id="CWE-704",
                    scanner_name=self.name,
                    scanner_version=version,
                    scanner_rule_id=rule_id,
                    confidence="high",
                    code_snippet=None,
                    risk_explanation="Type safety error can cause unexpected runtime exceptions in production.",
                    remediation="Resolve type mismatch by aligning data types or providing proper type assertions."
                ))

            return ScannerResult(
                scanner_name=self.name,
                status="completed",
                version=version,
                findings=findings
            )

        except Exception as e:
            logger.error(f"TypeScript compiler scan failed: {e}")
            return ScannerResult(
                scanner_name=self.name,
                status="error",
                version=version,
                error_message=str(e)
            )
