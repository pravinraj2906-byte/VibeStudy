import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.schemas.project import FileTreeNode

# Regex to detect potential secrets to mask
SECRET_PATTERNS = [
    re.compile(r'(?i)(?:api_?key|secret|password|token|bearer|auth|credentials)\s*[:=]\s*["\']([a-zA-Z0-9_\-\.]{12,})["\']'),
    re.compile(r'AKIA[0-9A-Z]{16}'),           # AWS Access Key
    re.compile(r'ghp_[a-zA-Z0-9]{36}'),        # GitHub PAT
    re.compile(r'AIzaSy[a-zA-Z0-9_\-]{33}'),   # Google API key
    re.compile(r'ey[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]+'), # JWT
    re.compile(r'-----BEGIN (?:RSA )?PRIVATE KEY-----'),
]

class CodebaseAnalyzer:
    @staticmethod
    def mask_secrets(text: str) -> str:
        """Masks detected secrets from code before transmitting or displaying."""
        masked = text
        for pattern in SECRET_PATTERNS:
            masked = pattern.sub('[REDACTED_SECRET]', masked)
        return masked

    @classmethod
    def build_file_tree(cls, base_dir: Path, current_dir: Optional[Path] = None) -> List[FileTreeNode]:
        """Recursively builds a deterministic file tree representation."""
        if current_dir is None:
            current_dir = base_dir
        
        nodes: List[FileTreeNode] = []
        if not current_dir.exists():
            return nodes

        for entry in sorted(current_dir.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            rel_path = str(entry.relative_to(base_dir)).replace("\\", "/")
            if entry.name.startswith(".") and entry.name not in [".env.example", ".gitignore"]:
                continue
            if entry.name in ["node_modules", ".git", "__pycache__", "dist", "build"]:
                continue

            if entry.is_dir():
                children = cls.build_file_tree(base_dir, entry)
                nodes.append(FileTreeNode(
                    name=entry.name,
                    path=rel_path,
                    type="directory",
                    children=children
                ))
            else:
                try:
                    size = entry.stat().st_size
                except Exception:
                    size = 0
                nodes.append(FileTreeNode(
                    name=entry.name,
                    path=rel_path,
                    type="file",
                    size=size
                ))
        return nodes

    @classmethod
    def analyze_stack(cls, repo_dir: Path) -> Dict[str, Any]:
        """Detects dependencies, language, and primary framework."""
        result: Dict[str, Any] = {
            "framework": "Unknown",
            "language": "JavaScript",
            "dependencies": {},
            "devDependencies": {},
            "scripts": {},
            "has_dockerfile": False,
            "has_env_example": False,
        }

        pkg_path = repo_dir / "package.json"
        if pkg_path.exists():
            try:
                pkg_data = json.loads(pkg_path.read_text(encoding="utf-8", errors="ignore"))
                deps = pkg_data.get("dependencies", {})
                dev_deps = pkg_data.get("devDependencies", {})
                scripts = pkg_data.get("scripts", {})

                result["dependencies"] = deps
                result["devDependencies"] = dev_deps
                result["scripts"] = scripts

                all_deps = {**deps, **dev_deps}
                
                # Check Language
                if "typescript" in all_deps or any(repo_dir.rglob("*.ts*")):
                    result["language"] = "TypeScript"
                else:
                    result["language"] = "JavaScript"

                # Check Framework
                if "react" in all_deps:
                    if "next" in all_deps:
                        result["framework"] = "Next.js"
                    elif "vite" in all_deps:
                        result["framework"] = "React (Vite)"
                    else:
                        result["framework"] = "React"
                elif "express" in all_deps:
                    result["framework"] = "Express.js"
                elif "vue" in all_deps:
                    result["framework"] = "Vue.js"
                elif "svelte" in all_deps:
                    result["framework"] = "Svelte"
            except Exception:
                pass
        
        # Check Python
        py_files = list(repo_dir.glob("*.py")) + list(repo_dir.glob("requirements.txt"))
        if py_files and result["framework"] == "Unknown":
            result["language"] = "Python"
            if (repo_dir / "requirements.txt").exists():
                reqs = (repo_dir / "requirements.txt").read_text(encoding="utf-8", errors="ignore")
                if "fastapi" in reqs.lower():
                    result["framework"] = "FastAPI"
                elif "flask" in reqs.lower():
                    result["framework"] = "Flask"
                elif "django" in reqs.lower():
                    result["framework"] = "Django"

        if (repo_dir / "Dockerfile").exists():
            result["has_dockerfile"] = True
        if (repo_dir / ".env.example").exists():
            result["has_env_example"] = True

        return result

    @classmethod
    def discover_components(cls, repo_dir: Path) -> List[Dict[str, Any]]:
        """Finds frontend components and React function declarations."""
        components = []
        for file_path in repo_dir.rglob("*.[tj]sx"):
            if "node_modules" in file_path.parts:
                continue
            try:
                rel_path = str(file_path.relative_to(repo_dir)).replace("\\", "/")
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                
                # Regex for function components
                # e.g. function ComponentName, const ComponentName = ..., export default function ...
                matches = re.finditer(
                    r'(?:export\s+(?:default\s+)?)?(?:function\s+([A-Z][a-zA-Z0-9_]*)|const\s+([A-Z][a-zA-Z0-9_]*)\s*[:=]\s*(?:React\.FC|\(?\s*\w*\s*\)?\s*=>))',
                    content
                )
                for m in matches:
                    comp_name = m.group(1) or m.group(2)
                    line_no = content[:m.start()].count("\n") + 1
                    components.append({
                        "name": comp_name,
                        "file_path": rel_path,
                        "line_number": line_no,
                        "type": "React Component"
                    })
            except Exception:
                continue
        return components

    @classmethod
    def discover_routes(cls, repo_dir: Path) -> Dict[str, List[Dict[str, Any]]]:
        """Discovers frontend and backend routes."""
        frontend_routes = []
        backend_routes = []

        # React Router routes
        for file_path in repo_dir.rglob("*.[tj]sx"):
            if "node_modules" in file_path.parts:
                continue
            try:
                rel_path = str(file_path.relative_to(repo_dir)).replace("\\", "/")
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                route_matches = re.finditer(r'<Route\s+[^>]*path=["\']([^"\']+)["\'][^>]*>', content)
                for m in route_matches:
                    path_val = m.group(1)
                    line_no = content[:m.start()].count("\n") + 1
                    frontend_routes.append({
                        "path": path_val,
                        "file_path": rel_path,
                        "line_number": line_no
                    })
            except Exception:
                continue

        # Express.js or FastAPI backend routes
        for file_path in repo_dir.rglob("*.[tj]s"):
            if "node_modules" in file_path.parts:
                continue
            try:
                rel_path = str(file_path.relative_to(repo_dir)).replace("\\", "/")
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                matches = re.finditer(r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', content)
                for m in matches:
                    method = m.group(1).upper()
                    route_path = m.group(2)
                    line_no = content[:m.start()].count("\n") + 1
                    backend_routes.append({
                        "method": method,
                        "path": route_path,
                        "file_path": rel_path,
                        "line_number": line_no
                    })
            except Exception:
                continue

        return {
            "frontend": frontend_routes,
            "backend": backend_routes
        }

    @classmethod
    def discover_api_calls(cls, repo_dir: Path) -> List[Dict[str, Any]]:
        """Finds API / network interactions such as fetch() or axios calls."""
        api_calls = []
        for file_path in repo_dir.rglob("*.[tj]s*"):
            if "node_modules" in file_path.parts:
                continue
            try:
                rel_path = str(file_path.relative_to(repo_dir)).replace("\\", "/")
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                
                # Fetch calls
                fetch_matches = re.finditer(r'fetch\s*\(\s*[`"\']([^`"\']+)[`"\']', content)
                for m in fetch_matches:
                    endpoint = m.group(1)
                    line_no = content[:m.start()].count("\n") + 1
                    api_calls.append({
                        "client": "fetch",
                        "endpoint": endpoint,
                        "file_path": rel_path,
                        "line_number": line_no
                    })

                # Axios calls
                axios_matches = re.finditer(r'axios\.(get|post|put|delete|patch)\s*\(\s*[`"\']([^`"\']+)[`"\']', content)
                for m in axios_matches:
                    method = m.group(1).upper()
                    endpoint = m.group(2)
                    line_no = content[:m.start()].count("\n") + 1
                    api_calls.append({
                        "client": f"axios.{method}",
                        "endpoint": endpoint,
                        "file_path": rel_path,
                        "line_number": line_no
                    })
            except Exception:
                continue
        return api_calls
