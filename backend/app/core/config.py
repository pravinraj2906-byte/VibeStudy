import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field, model_validator

# Base directory for backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str
    GEMINI_API_KEY: str
    APP_ENV: str = "development"
    CODE_EXECUTION_ENABLED: bool = False
    
    # Auth & Security
    SECRET_KEY: str = "proofforge-super-secret-key-phase1-production-grade"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # Analysis Limits
    MAX_REPO_SIZE_MB: int = 50
    MAX_FILE_SIZE_BYTES: int = 1_000_000  # 1MB per file
    MAX_TOTAL_FILES: int = 500

    @model_validator(mode="after")
    def production_security(self):
        if self.APP_ENV.lower() == "production":
            if len(self.SECRET_KEY) < 32 or self.SECRET_KEY == "proofforge-super-secret-key-phase1-production-grade":
                raise ValueError("Production requires a unique SECRET_KEY of at least 32 characters")
            if not self.CORS_ORIGINS or any(not origin.startswith("https://") or "*" in origin for origin in self.CORS_ORIGINS):
                raise ValueError("Production requires exact HTTPS CORS origins")
            if self.CODE_EXECUTION_ENABLED:
                raise ValueError("Code execution must remain disabled on the web service; deploy an isolated worker first")
        return self

    @computed_field
    @property
    def sync_database_url(self) -> str:
        url = self.DATABASE_URL.strip().strip('"').strip("'")
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

settings = Settings()
