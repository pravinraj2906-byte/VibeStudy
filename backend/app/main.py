import time
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.v1.router import api_router

# Configure sanitized logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("proofforge.api")

app = FastAPI(
    title="ProofForge AI API",
    description="Backend services for ProofForge AI — From Vibe Coding to Real Engineering",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Student submissions must never execute in the public web service.
@app.middleware("http")
async def enforce_execution_policy(request: Request, call_next):
    path = request.url.path.rstrip("/")
    if not settings.CODE_EXECUTION_ENABLED and request.method == "POST" and (
        path.endswith("/reproduce") or path.endswith("/verify") or path.endswith("/submit")
    ):
        return JSONResponse(status_code=503, content={"detail": "Code execution is unavailable until an isolated worker is deployed."})
    return await call_next(request)

@app.get("/api/v1/capabilities")
def capabilities():
    return {"code_execution": settings.CODE_EXECUTION_ENABLED}

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing & Logging Middleware (sanitized, zero secret leakage)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    method = request.method
    
    try:
        response = await call_next(request)
        duration = round((time.time() - start_time) * 1000, 2)
        logger.info(f"{method} {path} completed with {response.status_code} in {duration}ms")
        response.headers["X-Response-Time-Ms"] = str(duration)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
    except Exception as exc:
        duration = round((time.time() - start_time) * 1000, 2)
        logger.error(f"{method} {path} failed in {duration}ms with error: {type(exc).__name__}")
        raise

# Structured Error Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "path": request.url.path
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(x) for x in err.get("loc", [])])
        errors.append({
            "field": loc,
            "message": err.get("msg")
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": 422,
                "message": "Validation Error",
                "details": errors,
                "path": request.url.path
            }
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": 500,
                "message": "Internal server error occurred",
                "path": request.url.path
            }
        }
    )

# Include API Router
app.include_router(api_router, prefix="/api/v1")

@app.get("/", summary="API Root")
def root():
    return {
        "name": "ProofForge AI API",
        "tagline": "From Vibe Coding to Real Engineering",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/v1/health"
    }
