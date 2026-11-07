from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class RawFinding(BaseModel):
    title: str
    description: str
    severity: str  # critical, high, medium, low, info
    category: str  # security, architecture, performance, code_quality
    file_path: str
    line_number: Optional[int] = None
    line_end: Optional[int] = None
    cwe_id: Optional[str] = None
    scanner_name: str
    scanner_version: Optional[str] = None
    scanner_rule_id: Optional[str] = None
    confidence: str = "medium"  # high, medium, low
    code_snippet: Optional[str] = None
    risk_explanation: Optional[str] = None
    remediation: Optional[str] = None
    verification_status: str = "static_finding"

class ScannerResult(BaseModel):
    scanner_name: str
    status: str  # completed, scanner_unavailable, error
    version: Optional[str] = None
    findings: List[RawFinding] = []
    error_message: Optional[str] = None

class BaseScanner(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the scanner binary/tool is available in the environment."""
        pass

    @abstractmethod
    def get_version(self) -> Optional[str]:
        """Get the version of the installed scanner tool."""
        pass

    @abstractmethod
    def scan(self, repo_path: str) -> ScannerResult:
        """Execute the scan against the target repository path and return normalized results."""
        pass
