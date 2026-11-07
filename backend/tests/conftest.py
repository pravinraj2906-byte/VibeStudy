import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.db.session import SessionLocal, engine
from app.models import Base, User, Project
from app.core.security import hash_password, create_access_token

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def test_user(db_session):
    email = "testuser_phase1@proofforge.ai"
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=hash_password("ProofForgeSecurePass123!"),
            full_name="Phase1 Test User",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_user_token(test_user):
    return create_access_token(subject=test_user.id)

@pytest.fixture(scope="function")
def other_user(db_session):
    email = "otheruser_phase1@proofforge.ai"
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=hash_password("ProofForgeSecurePass123!"),
            full_name="Other User",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def other_user_token(other_user):
    return create_access_token(subject=other_user.id)
