import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/health", summary="Basic service health check")
def health_check():
    """Returns basic service health status."""
    return {
        "status": "healthy",
        "app": "ProofForge AI",
        "version": "0.1.0",
        "environment": "development"
    }

@router.get("/health/db", summary="Database connectivity and readiness check")
def db_health_check(db: Session = Depends(get_db)):
    """Verifies that the Neon PostgreSQL connection is active and responsive."""
    start_time = time.time()
    try:
        # Execute minimal query
        result = db.execute(text("SELECT 1;")).scalar()
        latency_ms = round((time.time() - start_time) * 1000, 2)
        if result == 1:
            return {
                "status": "healthy",
                "database": "connected",
                "provider": "Neon PostgreSQL",
                "latency_ms": latency_ms
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database query returned unexpected result"
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {type(exc).__name__}"
        )
