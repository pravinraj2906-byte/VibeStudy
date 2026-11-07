from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, Token, FirebaseSyncRequest
from app.core.security import hash_password, verify_password, create_access_token
from app.core.firebase import verify_firebase_id_token
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED, summary="Register a new user")
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Creates a new user account with secure password hashing and returns an access token."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
    
    hashed_pwd = hash_password(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/login", response_model=Token, summary="Authenticate user and receive token")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Validates user credentials and returns a JWT access token."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/firebase-login", response_model=Token, summary="Exchange verified Firebase ID token for ProofForge session")
def firebase_login(req: FirebaseSyncRequest, db: Session = Depends(get_db)):
    """
    Verifies a Firebase ID token, provisions or links the user in Neon DB,
    and returns a ProofForge access token with the user profile.
    """
    claims = verify_firebase_id_token(req.id_token)
    if not claims or "uid" not in claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token verification failed or token is invalid"
        )
    
    f_uid = claims["uid"]
    f_email = claims.get("email")
    f_name = claims.get("name") or claims.get("display_name")
    provider = claims.get("firebase", {}).get("sign_in_provider", "google.com")

    if not f_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase user profile must include an email address"
        )

    # 1. Lookup by firebase_uid
    user = db.query(User).filter(User.firebase_uid == f_uid).first()

    # 2. Lookup by email for safe account linking
    if not user:
        user = db.query(User).filter(User.email == f_email).first()
        if user:
            user.firebase_uid = f_uid
            user.auth_provider = provider
            if f_name and not user.full_name:
                user.full_name = f_name
            db.commit()
            db.refresh(user)

    # 3. Provision new user if not found
    if not user:
        user = User(
            email=f_email,
            firebase_uid=f_uid,
            full_name=f_name or f_email.split("@")[0],
            auth_provider=provider,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserOut, summary="Get current authenticated user profile")
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the profile of the currently logged-in user."""
    return UserOut.model_validate(current_user)
