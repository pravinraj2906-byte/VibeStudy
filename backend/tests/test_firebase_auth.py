import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.db.session import get_db

client = TestClient(app)

def test_firebase_login_new_user():
    fake_claims = {
        "uid": "fb_uid_test_12345",
        "email": "firebase_user_new@proofforge.ai",
        "name": "Firebase Test User",
        "firebase": {"sign_in_provider": "google.com"}
    }

    with patch("app.api.v1.auth.verify_firebase_id_token", return_value=fake_claims):
        res = client.post("/api/v1/auth/firebase-login", json={"id_token": "valid_firebase_id_token_xyz"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "firebase_user_new@proofforge.ai"
        assert data["user"]["auth_provider"] == "google.com"
        assert data["user"]["firebase_uid"] == "fb_uid_test_12345"


def test_firebase_login_existing_user_linking():
    db = next(get_db())
    local_email = "link_existing_user@proofforge.ai"
    existing = db.query(User).filter(User.email == local_email).first()
    if not existing:
        existing = User(
            email=local_email,
            full_name="Local Registered Dev",
            hashed_password="some_hashed_password",
            auth_provider="local",
            is_active=True
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)

    fake_claims = {
        "uid": "fb_uid_linked_99999",
        "email": local_email,
        "name": "Local Registered Dev",
        "firebase": {"sign_in_provider": "google.com"}
    }

    with patch("app.api.v1.auth.verify_firebase_id_token", return_value=fake_claims):
        res = client.post("/api/v1/auth/firebase-login", json={"id_token": "valid_firebase_token_link"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["id"] == existing.id
        assert data["user"]["firebase_uid"] == "fb_uid_linked_99999"


def test_firebase_invalid_token_rejected():
    with patch("app.api.v1.auth.verify_firebase_id_token", return_value=None):
        res = client.post("/api/v1/auth/firebase-login", json={"id_token": "invalid_or_expired_token"})
        assert res.status_code == 401
        assert "Firebase token verification failed" in res.json()["error"]["message"]


def test_firebase_bearer_token_direct_in_deps():
    fake_claims = {
        "uid": "fb_uid_direct_bearer_888",
        "email": "direct_bearer@proofforge.ai",
        "name": "Direct Bearer User",
        "firebase": {"sign_in_provider": "google.com"}
    }

    with patch("app.api.deps.verify_firebase_id_token", return_value=fake_claims):
        res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer raw_firebase_id_token_direct"})
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "direct_bearer@proofforge.ai"
        assert data["firebase_uid"] == "fb_uid_direct_bearer_888"
