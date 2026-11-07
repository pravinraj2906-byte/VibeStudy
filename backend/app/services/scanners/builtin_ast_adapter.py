import os
import re
import ast
import json
import logging
from typing import Optional, List
from app.services.scanners.base import BaseScanner, ScannerResult, RawFinding
from app.services.analyzer_service import CodebaseAnalyzer

logger = logging.getLogger("proofforge.scanners.builtin")

# Curated dependency vulnerabilities for rapid local auditing
VULNERABLE_PACKAGES_NPM = {
    "lodash": {"max_vulnerable": "4.17.20", "cve": "CVE-2021-23337", "cwe": "CWE-1321", "title": "Prototype Pollution in lodash", "desc": "Commands or objects can be injected via zipObjectDeep or merge."},
    "axios": {"max_vulnerable": "0.21.1", "cve": "CVE-2021-3749", "cwe": "CWE-918", "title": "Server-Side Request Forgery in axios", "desc": "Axios follows insecure redirects exposing credentials."},
    "jsonwebtoken": {"max_vulnerable": "8.5.1", "cve": "CVE-2022-23529", "cwe": "CWE-502", "title": "Insecure Deserialization in jsonwebtoken", "desc": "Arbitrary code execution via maliciously crafted secret or payload."},
    "minimist": {"max_vulnerable": "1.2.5", "cve": "CVE-2021-44906", "cwe": "CWE-1321", "title": "Prototype Pollution in minimist", "desc": "Pollution via parsed argument keys."}
}

class BuiltinAstScanner(BaseScanner):
    @property
    def name(self) -> str:
        return "builtin_ast"

    def is_available(self) -> bool:
        return True

    def get_version(self) -> Optional[str]:
        return "2.1.0"

    def scan(self, repo_path: str) -> ScannerResult:
        findings: List[RawFinding] = []
        version = self.get_version()

        try:
            for root, _, files in os.walk(repo_path):
                # Skip build and dependency directories
                rel_root = os.path.relpath(root, repo_path)
                parts = rel_root.split(os.sep)
                if any(p in [".git", "node_modules", "dist", "build", ".venv", "__pycache__", ".pytest_cache"] for p in parts):
                    continue

                for fname in files:
                    file_path = os.path.join(root, fname)
                    rel_path = os.path.relpath(file_path, repo_path).replace("\\", "/")

                    # 1. Dependency Analysis
                    if fname == "package.json" or fname.endswith(".json"):
                        self._scan_package_json(file_path, rel_path, findings)
                    
                    # 2. Source Code Static Checks
                    if fname.endswith((".ts", ".tsx", ".js", ".jsx", ".py")):
                        self._scan_source_file(file_path, rel_path, findings)

            return ScannerResult(
                scanner_name=self.name,
                status="completed",
                version=version,
                findings=findings
            )
        except Exception as e:
            logger.error(f"Built-in AST scanner encountered error: {e}")
            return ScannerResult(
                scanner_name=self.name,
                status="error",
                version=version,
                error_message=str(e)
            )

    def _scan_package_json(self, file_path: str, rel_path: str, findings: List[RawFinding]):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            
            for pkg, ver_str in deps.items():
                clean_ver = re.sub(r"[^\d.]", "", ver_str)
                if pkg in VULNERABLE_PACKAGES_NPM and clean_ver:
                    vuln_info = VULNERABLE_PACKAGES_NPM[pkg]
                    # Simple semver check
                    if clean_ver <= vuln_info["max_vulnerable"]:
                        findings.append(RawFinding(
                            title=f"Dependency Advisory: {vuln_info['title']}",
                            description=f"{vuln_info['desc']} (Installed: {ver_str}, Advisory: {vuln_info['cve']})",
                            severity="high",
                            category="security",
                            file_path=rel_path,
                            line_number=1,
                            cwe_id=vuln_info["cwe"],
                            scanner_name=self.name,
                            scanner_version=self.get_version(),
                            scanner_rule_id=f"dep.{vuln_info['cve'].lower()}",
                            confidence="high",
                            code_snippet=f'"{pkg}": "{ver_str}"',
                            risk_explanation=f"Package {pkg} contains known security flaw {vuln_info['cve']}.",
                            remediation=f"Upgrade {pkg} to a patched release higher than {vuln_info['max_vulnerable']}."
                        ))
        except Exception as e:
            logger.debug(f"Could not parse package.json for dependencies: {e}")

    def _scan_source_file(self, file_path: str, rel_path: str, findings: List[RawFinding]):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception:
            return

        for idx, line in enumerate(lines):
            line_no = idx + 1
            line_clean = line.strip()

            # A. Secret Exposure Check
            secret_patterns = [
                (r"(AKIA[0-9A-Z]{16})", "AWS Access Key", "CWE-798", "critical"),
                (r"(ghp_[a-zA-Z0-9]{36})", "GitHub Personal Access Token", "CWE-798", "critical"),
                (r"(eyJh[a-zA-Z0-9_-]+\.eyJh[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)", "Hardcoded JWT Token", "CWE-798", "high"),
                (r"(-----BEGIN (?:RSA )?PRIVATE KEY-----)", "Exposed Private Key", "CWE-312", "critical"),
                (r"""(?i)(?:api_key|secret_key|client_secret|db_password)\s*=\s*['"][a-zA-Z0-9_\-\.]{12,}['"]""", "Hardcoded Credential or API Key", "CWE-798", "high")
            ]

            for regex, title, cwe, sev in secret_patterns:
                match = re.search(regex, line)
                if match:
                    # Redact the snippet! Never leak secret!
                    redacted = CodebaseAnalyzer.mask_secrets(line_clean)
                    findings.append(RawFinding(
                        title=f"Exposed Credential: {title}",
                        description=f"Potential sensitive secret or credential found in source file {rel_path}:{line_no}.",
                        severity=sev,
                        category="security",
                        file_path=rel_path,
                        line_number=line_no,
                        line_end=line_no,
                        cwe_id=cwe,
                        scanner_name=self.name,
                        scanner_version=self.get_version(),
                        scanner_rule_id="sec.exposed-secret",
                        confidence="high",
                        code_snippet=redacted,
                        risk_explanation="Exposed credentials in source repositories lead directly to system compromise and credential reuse.",
                        remediation="Move secret to external environment variables or secret vaults. Rotate all leaked keys immediately."
                    ))
                    break

            # B. React / Web Unsafe DOM Injection (XSS)
            if "dangerouslySetInnerHTML" in line:
                findings.append(RawFinding(
                    title="Unsafe DOM Rendering (Cross-Site Scripting Risk)",
                    description="dangerouslySetInnerHTML used without verifiable sanitization.",
                    severity="high",
                    category="security",
                    file_path=rel_path,
                    line_number=line_no,
                    line_end=line_no,
                    cwe_id="CWE-79",
                    scanner_name=self.name,
                    scanner_version=self.get_version(),
                    scanner_rule_id="sec.react-dangerouslysetinnerhtml",
                    confidence="high",
                    code_snippet=line_clean,
                    risk_explanation="Directly injecting unsanitized HTML allows attackers to execute arbitrary JavaScript in victim browsers.",
                    remediation="Sanitize HTML content using DOMPurify before injection, or render using standard React JSX child text."
                ))

        # File-Level & AST Checks
        full_text = "".join(lines)

        # C. Insecure CORS Configuration (Multi-line search)
        if "CORSMiddleware" in full_text:
            if re.search(r"allow_origins\s*=\s*\[\s*[\"']\*[\"']\s*\]", full_text) and re.search(r"allow_credentials\s*=\s*True", full_text):
                cors_line = 1
                for idx, line in enumerate(lines):
                    if "allow_origins" in line or "CORSMiddleware" in line:
                        cors_line = idx + 1
                        break
                findings.append(RawFinding(
                    title="Insecure CORS: Wildcard Origin with Credentials",
                    description="FastAPI/CORSMiddleware configured with allow_origins=['*'] alongside allow_credentials=True.",
                    severity="high",
                    category="security",
                    file_path=rel_path,
                    line_number=cors_line,
                    line_end=cors_line,
                    cwe_id="CWE-942",
                    scanner_name=self.name,
                    scanner_version=self.get_version(),
                    scanner_rule_id="sec.insecure-cors-wildcard",
                    confidence="high",
                    code_snippet='allow_origins=["*"], allow_credentials=True',
                    risk_explanation="Allows arbitrary third-party origins to make authenticated credentialed requests to this API.",
                    remediation="Specify explicit trusted origins in allow_origins instead of wildcard '*'."
                ))

        # D. Python AST Checks (IDOR detection)
        if file_path.endswith(".py"):
            self._scan_python_ast(full_text, rel_path, findings)

    def _scan_python_ast(self, full_text: str, rel_path: str, findings: List[RawFinding]):
        try:
            tree = ast.parse(full_text)
        except Exception:
            return

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                # Check decorators for route with {id} or {_id}
                is_id_route = False
                for dec in node.decorator_list:
                    if isinstance(dec, ast.Call):
                        for arg in dec.args:
                            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                                if "{" in arg.value and ("id}" in arg.value or "_id}" in arg.value):
                                    is_id_route = True
                                    break
                if not is_id_route:
                    continue

                fn_source = ast.get_source_segment(full_text, node) or ""
                # Check if the endpoint validates caller ownership of the record
                has_ownership_check = False
                for fn_line in fn_source.splitlines():
                    # Look for comparison lines containing owner or user checks
                    if any(key in fn_line for key in ["owner", "user_id", "owner_id", "current_user", "x_user"]):
                        if any(op in fn_line for op in ["==", "!=", " in ", " not in ", "filter"]):
                            has_ownership_check = True
                            break

                if not has_ownership_check:
                    findings.append(RawFinding(
                        title="Broken Object-Level Authorization (IDOR) Risk",
                        description=f"Endpoint '{node.name}' retrieves resource by ID without validating ownership against the authenticated user.",
                        severity="high",
                        category="security",
                        file_path=rel_path,
                        line_number=node.lineno,
                        line_end=getattr(node, "end_lineno", node.lineno),
                        cwe_id="CWE-639",
                        scanner_name=self.name,
                        scanner_version=self.get_version(),
                        scanner_rule_id="sec.idor-missing-ownership-check",
                        confidence="high",
                        code_snippet=fn_source[:200] if fn_source else f"def {node.name}(...)",
                        risk_explanation="Users can access or manipulate records belonging to other users simply by guessing or substituting resource IDs.",
                        remediation="Validate that the requested resource's owner matches the authenticated caller before returning data."
                    ))
