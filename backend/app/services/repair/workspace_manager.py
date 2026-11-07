import os
import shutil
import difflib
import logging
from typing import Tuple, Optional

logger = logging.getLogger("proofforge.repair.workspace")

FIXTURES_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "fixtures")
)
WORKSPACES_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "storage", "workspaces")
)

MAX_CODE_BYTES = 500_000

class WorkspaceSecurityError(Exception):
    pass

class WorkspaceManager:
    @staticmethod
    def ensure_workspaces_root():
        os.makedirs(WORKSPACES_ROOT, exist_ok=True)

    @classmethod
    def get_workspace_dir(cls, session_id: int) -> str:
        return os.path.join(WORKSPACES_ROOT, f"repair_{session_id}")

    @classmethod
    def get_fixture_dir(cls, fixture_id: str) -> str:
        fixture_path = os.path.abspath(os.path.join(FIXTURES_ROOT, fixture_id))
        if not fixture_path.startswith(FIXTURES_ROOT) or not os.path.isdir(fixture_path):
            raise WorkspaceSecurityError(f"Invalid or unauthorized fixture ID: {fixture_id}")
        return fixture_path

    @classmethod
    def validate_file_path(cls, file_path: str, allowed_file: str = "app.py") -> str:
        if not file_path or "\0" in file_path:
            raise WorkspaceSecurityError("Invalid file path containing null bytes.")
        
        # Normalize and remove leading slashes
        clean_name = os.path.basename(file_path.strip().replace("\\", "/"))
        if not clean_name or clean_name in (".", "..") or ".." in file_path:
            raise WorkspaceSecurityError("Path traversal or relative directory escape attempt detected.")
        
        if clean_name != allowed_file:
            raise WorkspaceSecurityError(f"Editing '{clean_name}' is unauthorized. Only '{allowed_file}' can be modified.")
            
        return clean_name

    @classmethod
    def validate_code_payload(cls, code: str):
        if not isinstance(code, str):
            raise WorkspaceSecurityError("Code payload must be valid string.")
        
        if "\0" in code:
            raise WorkspaceSecurityError("Binary payload rejected: code contains null bytes.")
        
        encoded = code.encode("utf-8", errors="replace")
        if len(encoded) > MAX_CODE_BYTES:
            raise WorkspaceSecurityError(f"Code payload exceeds maximum size limit ({len(encoded)} > {MAX_CODE_BYTES} bytes).")

    @classmethod
    def initialize_workspace(cls, session_id: int, fixture_id: str = "fixture_idor") -> str:
        """
        Creates an isolated ephemeral practice workspace by copying the approved template fixture.
        The original template in backend/fixtures/ is never modified.
        """
        cls.ensure_workspaces_root()
        fixture_dir = cls.get_fixture_dir(fixture_id)
        workspace_dir = cls.get_workspace_dir(session_id)

        if not os.path.exists(workspace_dir):
            os.makedirs(workspace_dir, exist_ok=True)
            for item in os.listdir(fixture_dir):
                s = os.path.join(fixture_dir, item)
                d = os.path.join(workspace_dir, item)
                if os.path.isdir(s):
                    shutil.copytree(s, d, dirs_exist_ok=True)
                else:
                    shutil.copy2(s, d)

        return workspace_dir

    @classmethod
    def reset_workspace(cls, session_id: int, fixture_id: str = "fixture_idor") -> str:
        """
        Resets the practice workspace back to the immutable fixture template.
        """
        cls.ensure_workspaces_root()
        fixture_dir = cls.get_fixture_dir(fixture_id)
        workspace_dir = cls.get_workspace_dir(session_id)

        if os.path.exists(workspace_dir):
            shutil.rmtree(workspace_dir, ignore_errors=True)

        os.makedirs(workspace_dir, exist_ok=True)
        for item in os.listdir(fixture_dir):
            s = os.path.join(fixture_dir, item)
            d = os.path.join(workspace_dir, item)
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)

        return workspace_dir

    @classmethod
    def read_original_code(cls, fixture_id: str = "fixture_idor", file_path: str = "app.py") -> str:
        clean_file = cls.validate_file_path(file_path)
        fixture_dir = cls.get_fixture_dir(fixture_id)
        target_path = os.path.join(fixture_dir, clean_file)
        if not os.path.exists(target_path):
            raise WorkspaceSecurityError(f"Original file not found: {clean_file}")
        with open(target_path, "r", encoding="utf-8") as f:
            return f.read()

    @classmethod
    def read_practice_code(cls, session_id: int, file_path: str = "app.py") -> str:
        clean_file = cls.validate_file_path(file_path)
        workspace_dir = cls.get_workspace_dir(session_id)
        target_path = os.path.join(workspace_dir, clean_file)
        if not os.path.exists(target_path):
            raise WorkspaceSecurityError(f"Practice file not found in workspace: {clean_file}")
        with open(target_path, "r", encoding="utf-8") as f:
            return f.read()

    @classmethod
    def write_practice_code(cls, session_id: int, file_path: str, code: str) -> str:
        clean_file = cls.validate_file_path(file_path)
        cls.validate_code_payload(code)
        workspace_dir = cls.get_workspace_dir(session_id)
        target_path = os.path.join(workspace_dir, clean_file)

        # Enforce symlink safety: ensure target is not a symlink pointing outside
        if os.path.islink(target_path):
            raise WorkspaceSecurityError("Symlink escape attempt detected.")

        with open(target_path, "w", encoding="utf-8") as f:
            f.write(code)

        return target_path

    @classmethod
    def compute_diff(cls, original_code: str, proposed_code: str, file_path: str = "app.py") -> str:
        orig_lines = original_code.splitlines(keepends=True)
        prop_lines = proposed_code.splitlines(keepends=True)
        diff = difflib.unified_diff(
            orig_lines,
            prop_lines,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            lineterm=""
        )
        return "".join(diff)
