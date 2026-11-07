import logging
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_access_token
from app.core.firebase import verify_firebase_id_token
from app.models.user import User

logger = logging.getLogger("proofforge.auth.deps")
security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency that authenticates the user via either:
    1. ProofForge JWT Bearer token (issued by backend).
    2. Firebase ID Token (issued by Firebase client SDK and verified server-side).
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials

    # 1. First, attempt to decode as ProofForge local JWT access token
    payload = decode_access_token(token)
    if payload and "sub" in payload:
        try:
            user_id = int(payload["sub"])
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                if not user.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="User account is deactivated"
                    )
                return user
        except ValueError:
            pass

    # 2. Second, attempt to verify as a Firebase ID token
    firebase_claims = verify_firebase_id_token(token)
    if firebase_claims:
        f_uid = firebase_claims.get("uid")
        f_email = firebase_claims.get("email")
        f_name = firebase_claims.get("name") or firebase_claims.get("display_name")
        sign_in_provider = firebase_claims.get("firebase", {}).get("sign_in_provider", "firebase")

        if f_uid:
            # Check if user already exists with this Firebase UID
            user = db.query(User).filter(User.firebase_uid == f_uid).first()

            # If not found by UID, check if email matches an existing local user (Account Linking)
            if not user and f_email:
                user = db.query(User).filter(User.email == f_email).first()
                if user:
                    user.firebase_uid = f_uid
                    user.auth_provider = sign_in_provider
                    if f_name and not user.full_name:
                        user.full_name = f_name
                    db.commit()
                    db.refresh(user)

            # If still not found, provision a new user record in Neon PostgreSQL
            if not user and f_email:
                user = User(
                    email=f_email,
                    firebase_uid=f_uid,
                    full_name=f_name or f_email.split("@")[0],
                    auth_provider=sign_in_provider,
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            if user:
                if not user.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="User account is deactivated"
                    )
                return user

    # 3. If neither token type resolved to a valid user, reject
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid, expired, or malformed authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
