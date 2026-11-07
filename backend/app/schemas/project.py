from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, HttpUrl, Field, ConfigDict

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    repo_url: Optional[str] = None
    default_branch: str = "main"

class ProjectCreate(ProjectBase):
    framework: Optional[str] = None
    language: Optional[str] = None

class ProjectOut(ProjectBase):
    id: int
    user_id: int
    commit_sha: Optional[str] = None
    framework: Optional[str] = None
    language: Optional[str] = None
    status: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RepoImportRequest(BaseModel):
    repo_url: str = Field(..., description="Public GitHub repository URL (e.g. https://github.com/owner/repo)")
    branch: Optional[str] = Field("main", description="Branch name or commit ref")

class FileTreeNode(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"
    size: Optional[int] = None
    children: Optional[List["FileTreeNode"]] = None

class ProjectFileTree(BaseModel):
    project_id: int
    commit_sha: Optional[str] = None
    tree: List[FileTreeNode]

class FileContentRequest(BaseModel):
    path: str

class FileContentResponse(BaseModel):
    project_id: int
    path: str
    content: str
    size: int
    is_truncated: bool = False

class ComponentExplanationRequest(BaseModel):
    file_path: str
    symbol_name: Optional[str] = None
    query: Optional[str] = "Explain the architecture, purpose, and key logic of this component."

class ComponentExplanationResponse(BaseModel):
    project_id: int
    file_path: str
    explanation: str
    framework: Optional[str] = None
    dependencies: List[str] = []
    routes: List[str] = []
    source_references: List[Dict[str, Any]] = []
