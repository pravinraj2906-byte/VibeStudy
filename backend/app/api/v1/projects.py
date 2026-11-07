import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.project import Project, ScanJob
from app.models.finding import Finding
from app.schemas.project import (
    ProjectCreate, ProjectOut, RepoImportRequest,
    ProjectFileTree, FileTreeNode, FileContentResponse,
    ComponentExplanationRequest, ComponentExplanationResponse
)
from app.schemas.finding import FindingOut, ScanJobOut
from app.api.deps import get_current_user
from app.services.github_service import GitHubService, STORAGE_DIR
from app.services.analyzer_service import CodebaseAnalyzer
from app.services.gemini_service import GeminiService
from app.services.security_scan_service import SecurityScanService

router = APIRouter()
gemini_service = GeminiService()
scan_service = SecurityScanService()

@router.get("/", response_model=List[ProjectOut], summary="List user's projects")
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all projects owned by the authenticated user."""
    projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()
    return projects

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED, summary="Create a new project")
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new project record manually."""
    project = Project(
        user_id=current_user.id,
        name=project_in.name,
        repo_url=project_in.repo_url,
        default_branch=project_in.default_branch,
        framework=project_in.framework,
        language=project_in.language,
        status="ready"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectOut, summary="Get project details")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves project details, ensuring tenant isolation."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project")
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a project and its associated scan jobs and files."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this project")
    
    # Clean up storage files if present
    repo_dirs = list(STORAGE_DIR.glob(f"proj_{project.id}_*"))
    for d in repo_dirs:
        shutil.rmtree(d, ignore_errors=True)

    db.delete(project)
    db.commit()
    return None

@router.post("/import", response_model=ProjectOut, status_code=status.HTTP_201_CREATED, summary="Import public GitHub repository")
async def import_repository(
    import_req: RepoImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Imports a public GitHub repository, validates URLs, downloads source files safely,
    executes deterministic structural analysis, identifies tech stack, and records commit SHA.
    """
    owner, repo_name = GitHubService.parse_repo_url(import_req.repo_url)
    
    # 1. Fetch metadata & commit SHA from GitHub API
    meta = await GitHubService.fetch_repo_metadata(owner, repo_name)
    default_branch = import_req.branch or meta.get("default_branch", "main")
    commit_sha = await GitHubService.get_latest_commit_sha(owner, repo_name, default_branch)

    # 2. Create Project in DB
    project = Project(
        user_id=current_user.id,
        name=meta.get("name", repo_name),
        repo_url=import_req.repo_url,
        default_branch=default_branch,
        commit_sha=commit_sha[:40] if commit_sha else None,
        status="scanning"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 3. Create ScanJob record
    scan_job = ScanJob(
        project_id=project.id,
        commit_sha=commit_sha,
        status="running"
    )
    db.add(scan_job)
    db.commit()

    dest_dir = STORAGE_DIR / f"proj_{project.id}_{commit_sha[:8]}"

    try:
        # 4. Safe download and extraction
        download_stats = await GitHubService.download_and_extract_safe(
            owner=owner,
            repo=repo_name,
            commit_sha=commit_sha,
            dest_dir=dest_dir
        )

        # 5. Deterministic analysis
        stack_info = CodebaseAnalyzer.analyze_stack(dest_dir)
        components = CodebaseAnalyzer.discover_components(dest_dir)
        routes = CodebaseAnalyzer.discover_routes(dest_dir)
        api_calls = CodebaseAnalyzer.discover_api_calls(dest_dir)

        # 6. Generate AI Overview
        ai_overview = gemini_service.generate_project_overview(
            project_name=project.name,
            stack_info=stack_info,
            routes=routes,
            components=components,
            api_calls=api_calls
        )

        # 7. Update Project & ScanJob in DB
        project.framework = stack_info.get("framework")
        project.language = stack_info.get("language")
        project.status = "ready"
        project.metadata_json = {
            "github": {
                "owner": owner,
                "repo": repo_name,
                "stars": meta.get("stargazers_count", 0),
                "description": meta.get("description", ""),
            },
            "download": download_stats,
            "stack": stack_info,
            "components_count": len(components),
            "components": components[:20],
            "routes": routes,
            "api_calls_count": len(api_calls),
            "api_calls": api_calls[:20],
            "ai_overview": ai_overview
        }
        
        scan_job.status = "completed"
        scan_job.summary_json = {
            "components_found": len(components),
            "routes_found": len(routes.get("frontend", [])) + len(routes.get("backend", [])),
            "api_calls_found": len(api_calls)
        }
        
        db.commit()
        db.refresh(project)
        return project

    except Exception as exc:
        project.status = "failed"
        scan_job.status = "failed"
        scan_job.error_message = str(exc)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Repository import failed: {str(exc)}"
        )

@router.get("/{project_id}/files", response_model=ProjectFileTree, summary="Get project file tree")
def get_project_files(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the file hierarchy of an imported project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sha_prefix = project.commit_sha[:8] if project.commit_sha else ""
    dest_dir = STORAGE_DIR / f"proj_{project.id}_{sha_prefix}"
    if not dest_dir.exists():
        # Fallback search
        matches = list(STORAGE_DIR.glob(f"proj_{project.id}_*"))
        if matches:
            dest_dir = matches[0]
        else:
            return ProjectFileTree(project_id=project.id, commit_sha=project.commit_sha, tree=[])

    tree = CodebaseAnalyzer.build_file_tree(dest_dir)
    return ProjectFileTree(
        project_id=project.id,
        commit_sha=project.commit_sha,
        tree=tree
    )

@router.get("/{project_id}/file-content", response_model=FileContentResponse, summary="Read sanitized source file")
def get_file_content(
    project_id: int,
    path: str = Query(..., description="Relative file path"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Safely reads and sanitizes a file's content, defending against path traversal."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sha_prefix = project.commit_sha[:8] if project.commit_sha else ""
    dest_dir = STORAGE_DIR / f"proj_{project.id}_{sha_prefix}"
    if not dest_dir.exists():
        matches = list(STORAGE_DIR.glob(f"proj_{project.id}_*"))
        if matches:
            dest_dir = matches[0]
        else:
            raise HTTPException(status_code=404, detail="Repository files not found on disk")

    # Path traversal protection
    clean_path = path.lstrip("/\\")
    target_file = (dest_dir / clean_path).resolve()
    if not str(target_file).startswith(str(dest_dir.resolve())):
        raise HTTPException(status_code=400, detail="Path traversal attempt detected")

    if not target_file.exists() or not target_file.is_file():
        raise HTTPException(status_code=404, detail=f"File '{clean_path}' not found")

    content = target_file.read_text(encoding="utf-8", errors="ignore")
    masked_content = CodebaseAnalyzer.mask_secrets(content)

    return FileContentResponse(
        project_id=project.id,
        path=clean_path,
        content=masked_content,
        size=len(masked_content),
        is_truncated=False
    )

@router.post("/{project_id}/explain", response_model=ComponentExplanationResponse, summary="AI-grounded component explanation")
def explain_component(
    project_id: int,
    req: ComponentExplanationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Produces a source-linked, grounded architectural explanation of a component or file using Gemini."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sha_prefix = project.commit_sha[:8] if project.commit_sha else ""
    dest_dir = STORAGE_DIR / f"proj_{project.id}_{sha_prefix}"
    if not dest_dir.exists():
        matches = list(STORAGE_DIR.glob(f"proj_{project.id}_*"))
        if matches:
            dest_dir = matches[0]
        else:
            raise HTTPException(status_code=404, detail="Repository files not found on disk")

    clean_path = req.file_path.lstrip("/\\")
    target_file = (dest_dir / clean_path).resolve()
    if not str(target_file).startswith(str(dest_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not target_file.exists():
        raise HTTPException(status_code=404, detail="File not found")

    content = target_file.read_text(encoding="utf-8", errors="ignore")
    stack_info = (project.metadata_json or {}).get("stack", {
        "framework": project.framework,
        "language": project.language,
        "dependencies": {}
    })

    explanation_data = gemini_service.explain_component(
        component_name=req.symbol_name or Path(clean_path).stem,
        file_path=clean_path,
        code_content=content,
        stack_info=stack_info,
        user_query=req.query
    )

    return ComponentExplanationResponse(
        project_id=project.id,
        file_path=clean_path,
        explanation=explanation_data["explanation"],
        framework=explanation_data.get("framework"),
        dependencies=explanation_data.get("dependencies", []),
        routes=[],
        source_references=explanation_data.get("source_references", [])
    )

@router.post("/{project_id}/scan", response_model=ScanJobOut, summary="Trigger security and engineering audit scan")
def run_security_scan(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers an audit across Semgrep, Gitleaks, OSV-Scanner, ESLint, TypeScript compiler, and AST scanner."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    sha_prefix = project.commit_sha[:8] if project.commit_sha else ""
    dest_dir = STORAGE_DIR / f"proj_{project.id}_{sha_prefix}"
    if not dest_dir.exists():
        matches = list(STORAGE_DIR.glob(f"proj_{project.id}_*"))
        if matches:
            dest_dir = matches[0]
        else:
            raise HTTPException(status_code=404, detail="Repository files not found on disk")

    scan_job = scan_service.run_full_scan(db, project, str(dest_dir), project.commit_sha)
    return scan_job

@router.get("/{project_id}/scans", response_model=List[ScanJobOut], summary="List scan jobs for project")
def list_project_scans(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all previous scan jobs for the project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    jobs = db.query(ScanJob).filter(ScanJob.project_id == project.id).order_by(ScanJob.started_at.desc()).all()
    return jobs

@router.get("/{project_id}/findings", response_model=List[FindingOut], summary="List findings for project")
def list_project_findings(
    project_id: int,
    severity: Optional[str] = Query(None, description="Filter by severity: critical, high, medium, low, info"),
    category: Optional[str] = Query(None, description="Filter by category: security, architecture, performance, code_quality"),
    scanner: Optional[str] = Query(None, description="Filter by scanner name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves normalized findings with optional severity, category, or scanner filtering."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    query = db.query(Finding).filter(Finding.project_id == project.id)
    if severity and severity != "all":
        query = query.filter(Finding.severity == severity)
    if category and category != "all":
        query = query.filter(Finding.category == category)
    if scanner and scanner != "all":
        query = query.filter(Finding.scanner_name == scanner)

    findings = query.order_by(Finding.id.desc()).all()
    return findings

