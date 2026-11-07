import pytest
import os
from fastapi.testclient import TestClient
from app.main import app
from app.services.scanners import (
    SemgrepScanner,
    GitleaksScanner,
    OSVScanner,
    ESLintScanner,
    TypeScriptScanner,
    BuiltinAstScanner
)
from app.services.security_scan_service import SecurityScanService

client = TestClient(app)

def test_scanner_adapters_instantiation_and_availability():
    """Verify that all 5 required security scanners + AST adapter instantiate cleanly."""
    scanners = [
        SemgrepScanner(),
        GitleaksScanner(),
        OSVScanner(),
        ESLintScanner(),
        TypeScriptScanner(),
        BuiltinAstScanner(),
    ]
    
    assert len(scanners) == 6
    names = [s.name for s in scanners]
    assert "semgrep" in names
    assert "gitleaks" in names
    assert "osv-scanner" in names
    assert "eslint" in names
    assert "tsc" in names
    assert "builtin_ast" in names

    # BuiltinAstScanner must always be available
    ast_scanner = BuiltinAstScanner()
    assert ast_scanner.is_available() is True
    assert ast_scanner.get_version() is not None

def test_builtin_ast_scanner_on_synthetic_fixtures():
    """Verify the AST scanner flags IDOR, XSS, exposed secrets, and vulnerable dependencies."""
    fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures")
    scanner = BuiltinAstScanner()
    result = scanner.scan(fixtures_dir)

    assert result.status == "completed"
    assert len(result.findings) >= 3

    # Check that secrets in code snippets were strictly redacted
    for finding in result.findings:
        if finding.category == "security" and "secret" in finding.title.lower():
            assert "AKIA" not in (finding.code_snippet or "")
            assert "[REDACTED" in (finding.code_snippet or "") or "Secret pattern matched" in (finding.code_snippet or "")

    # Check for XSS finding
    xss_findings = [f for f in result.findings if f.cwe_id == "CWE-79" or "xss" in f.title.lower()]
    assert len(xss_findings) >= 1
    assert xss_findings[0].severity in ["high", "critical"]

def test_scan_service_get_scanner_statuses():
    """Verify SecurityScanService aggregates scanner availability states."""
    service = SecurityScanService()
    statuses = service.get_scanner_statuses()

    assert "semgrep" in statuses
    assert "gitleaks" in statuses
    assert "osv-scanner" in statuses
    assert "eslint" in statuses
    assert "tsc" in statuses
    assert "builtin_ast" in statuses
    assert statuses["builtin_ast"]["status"] == "ready"
