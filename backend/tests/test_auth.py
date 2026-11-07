import uuid

def test_register_new_user(client):
    unique_email = f"user_{uuid.uuid4().hex[:8]}@proofforge.ai"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "full_name": "Test Engineer"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    assert "password" not in data["user"]

def test_duplicate_registration_fails(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "AnyPassword123!",
        "full_name": "Duplicate"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["error"]["message"]

def test_login_success(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "ProofForgeSecurePass123!"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_user.email

def test_login_invalid_password(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "WrongPassword!"
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401

def test_get_me_authenticated(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "email" in data

def test_get_me_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
