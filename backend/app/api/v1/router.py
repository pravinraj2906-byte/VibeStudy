from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.findings import router as findings_router
from app.api.v1.repairs import router as repairs_router
from app.api.v1.challenges import router as challenges_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.mentor_memory import router as mentor_memory_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="", tags=["System & Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects & Codebase Intelligence"])
api_router.include_router(findings_router, prefix="/findings", tags=["Security Audit & AI Mentor"])
api_router.include_router(repairs_router, prefix="", tags=["Guided Repair Studio"])
api_router.include_router(challenges_router, prefix="", tags=["Skill Transfer Lab"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Learning Analytics"])
api_router.include_router(mentor_memory_router, prefix="/projects", tags=["Personal Mentor Memory"])
