import os
import re
import io
import zipfile
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import httpx
from fastapi import HTTPException, status
from app.core.config import settings, BACKEND_DIR

logger = logging.getLogger("proofforge.github")

GITHUB_URL_PATTERN = re.compile(
    r"^https://github\.com/([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+?)(?:\.git)?/?$"
)

# Allowed file extensions for code analysis
ALLOWED_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".css",
    ".py", ".md", ".yml", ".yaml", ".env.example", ".toml", ".sql"
}

# Directories to skip
IGNORED_DIRS = {
    "node_modules", ".git", ".venv", "venv", "__pycache__", "dist",
    "build", ".next", ".turbo", "coverage", ".pytest_cache"
}

STORAGE_DIR = BACKEND_DIR / "storage" / "repos"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class GitHubService:
    @staticmethod
    def parse_repo_url(url: str) -> Tuple[str, str]:
        """Validates and extracts owner and repo from a GitHub URL."""
        cleaned = url.strip()
        match = GITHUB_URL_PATTERN.match(cleaned)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repository"
            )
        owner, repo = match.groups()
        return owner, repo

    @classmethod
    async def fetch_repo_metadata(cls, owner: str, repo: str) -> Dict[str, Any]:
        """Retrieves public repository metadata via the GitHub API."""
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ProofForge-AI-Scanner"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(api_url, headers=headers)
                if resp.status_code == 404:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"GitHub repository '{owner}/{repo}' not found or is private."
                    )
                if resp.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"GitHub API error: status {resp.status_code}"
                    )
                return resp.json()
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unable to reach GitHub API: {str(exc)}"
            )

    @classmethod
    async def get_latest_commit_sha(cls, owner: str, repo: str, branch: str = "main") -> str:
        """Fetches the latest commit SHA for a branch."""
        api_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{branch}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ProofForge-AI-Scanner"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(api_url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("sha", "")
                return "HEAD"
        except Exception:
            return "HEAD"

    @classmethod
    async def download_and_extract_safe(
        cls,
        owner: str,
        repo: str,
        commit_sha: str,
        dest_dir: Path
    ) -> Dict[str, Any]:
        """
        Safely downloads repository zipball archive, enforcing size limits,
        excluding symlinks, path traversal attacks, and unwanted binary files.
        """
        zip_urls = [
            f"https://api.github.com/repos/{owner}/{repo}/zipball/{commit_sha}",
            f"https://github.com/{owner}/{repo}/archive/{commit_sha}.zip",
            f"https://github.com/{owner}/{repo}/archive/refs/heads/main.zip",
        ]
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ProofForge-AI-Scanner"
        }
        if getattr(settings, "GITHUB_TOKEN", None):
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

        content = None
        last_error = None

        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            for url in zip_urls:
                try:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200 and resp.content:
                        content = resp.content
                        break
                    last_error = f"HTTP {resp.status_code}"
                except Exception as e:
                    last_error = str(e)
                    continue

        if not content:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to download repository archive from GitHub: {last_error}"
            )

        if len(content) > settings.MAX_REPO_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Repository zipball exceeds size limit of {settings.MAX_REPO_SIZE_MB}MB."
            )

        if dest_dir.exists():
            shutil.rmtree(dest_dir, ignore_errors=True)
        dest_dir.mkdir(parents=True, exist_ok=True)

        extracted_files = 0
        total_size = 0

        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            namelist = zf.namelist()
            if not namelist:
                raise HTTPException(status_code=400, detail="Empty repository archive")
            
            root_prefix = namelist[0].split("/")[0] + "/"

            for member in zf.infolist():
                if member.is_dir():
                    continue

                rel_name = member.filename
                if rel_name.startswith(root_prefix):
                    rel_name = rel_name[len(root_prefix):]

                if not rel_name or any(part.startswith(".") and part not in [".env.example"] for part in Path(rel_name).parts):
                    if not (rel_name.endswith(".gitignore") or rel_name.endswith(".env.example")):
                        continue

                # Defensive check for directory traversal
                if ".." in rel_name or rel_name.startswith("/") or "\\" in rel_name:
                    continue

                # Check if ignored directory
                path_parts = Path(rel_name).parts
                if any(part in IGNORED_DIRS for part in path_parts):
                    continue

                ext = Path(rel_name).suffix.lower()
                if ext not in ALLOWED_EXTENSIONS and Path(rel_name).name not in ["Dockerfile", "Makefile", "LICENSE", "README"]:
                    continue

                if member.file_size > settings.MAX_FILE_SIZE_BYTES:
                    continue

                total_size += member.file_size
                extracted_files += 1

                if extracted_files > settings.MAX_TOTAL_FILES:
                    break

                target_path = (dest_dir / rel_name).resolve()
                dest_dir_real = dest_dir.resolve()
                if not str(target_path).startswith(str(dest_dir_real)):
                    logger.warning(f"Zip-slip path traversal attempt rejected: {rel_name}")
                    continue

                target_path.parent.mkdir(parents=True, exist_ok=True)

                with zf.open(member) as source, open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)

        return {
            "extracted_files": extracted_files,
            "total_size_bytes": total_size,
            "path": str(dest_dir)
        }
