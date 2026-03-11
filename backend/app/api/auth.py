"""
Authentication Routes
=====================

User registration, login, and token management endpoints.
"""

from datetime import timedelta
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Request

from app.core.config import settings
from app.core.database import MongoDB, Collections
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    PasswordChange,
    PasswordReset,
    LoginForm,
    FirebaseLoginRequest,
)
from app.core.rate_limit import limiter

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_user(request: Request, user_data: UserCreate):
    """
    Register a new user and automatically log them in.
    
    - **email**: Unique email address
    - **password**: Strong password (min 8 chars, uppercase, lowercase, digit)
    - **full_name**: User's full name
    - **user_type**: user, researcher, or admin (default: user)
    """
    collection = MongoDB.get_collection(Collections.USERS)
    
    # Check if email already exists
    existing_user = await collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    from datetime import datetime
    user_id = str(uuid.uuid4())
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "user_type": user_data.user_type.value,
        "location": user_data.location.model_dump() if user_data.location else None,
        "is_active": True,
        "profile_image": None,
        "created_at": datetime.utcnow(),
        "updated_at": None
    }
    
    await collection.insert_one(user_doc)
    
    # Create tokens for auto-login
    token_data = {
        "sub": user_id,
        "email": user_data.email,
        "user_type": user_data.user_type.value
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse(
            user_id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            user_type=user_data.user_type,
            location=user_data.location,
            is_active=True,
            created_at=user_doc["created_at"]
        )
    )


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, form_data: LoginForm):
    """
    Authenticate user and return JWT tokens.
    
    - **username**: User's email address
    - **password**: User's password
    """
    import logging
    logger = logging.getLogger(__name__)
    
    collection = MongoDB.get_collection(Collections.USERS)
    
    # Find user by email
    user = await collection.find_one({"email": form_data.username})
    
    if not user:
        logger.warning(f"Login failed: no user found for email '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    password_hash = user.get("password_hash")
    if not password_hash or not verify_password(form_data.password, password_hash):
        logger.warning(f"Login failed: wrong password for '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.get("is_active", True):
        ban_detail = {
            "error": "account_banned",
            "message": "Your account has been deactivated.",
            "reason": user.get("deactivation_reason"),
            "reason_category": user.get("deactivation_category"),
            "is_temporary": user.get("is_temporary_ban", False),
            "duration_days": user.get("ban_duration_days"),
            "deactivated_at": user.get("deactivated_at").isoformat() if user.get("deactivated_at") else None,
        }
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ban_detail
        )
    
    # Create tokens
    token_data = {
        "sub": user["user_id"],
        "email": user["email"],
        "user_type": user["user_type"]
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            full_name=user["full_name"],
            user_type=user["user_type"],
            location=user.get("location"),
            profile_image=user.get("profile_image"),
            is_active=user.get("is_active", True),
            created_at=user["created_at"],
            updated_at=user.get("updated_at")
        )
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token
    """
    try:
        payload = decode_token(refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        collection = MongoDB.get_collection(Collections.USERS)
        user = await collection.find_one({"user_id": payload.get("sub")})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new tokens
        token_data = {
            "sub": user["user_id"],
            "email": user["email"],
            "user_type": user["user_type"]
        }
        
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)
        
        return Token(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="Bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=UserResponse(
                user_id=user["user_id"],
                email=user["email"],
                full_name=user["full_name"],
                user_type=user["user_type"],
                location=user.get("location"),
                profile_image=user.get("profile_image"),
                is_active=user.get("is_active", True),
                created_at=user["created_at"],
                updated_at=user.get("updated_at")
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """
    Change user password.
    
    - **current_password**: Current password
    - **new_password**: New password
    """
    collection = MongoDB.get_collection(Collections.USERS)
    
    user = await collection.find_one({"user_id": current_user["user_id"]})
    
    if not verify_password(password_data.current_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    from datetime import datetime
    await collection.update_one(
        {"user_id": current_user["user_id"]},
        {
            "$set": {
                "password_hash": get_password_hash(password_data.new_password),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information."""
    collection = MongoDB.get_collection(Collections.USERS)
    
    user = await collection.find_one({"user_id": current_user["user_id"]})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        full_name=user["full_name"],
        user_type=user["user_type"],
        location=user.get("location"),
        profile_image=user.get("profile_image"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"],
        updated_at=user.get("updated_at")
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user.
    
    Note: For JWT, actual logout is handled client-side by removing tokens.
    This endpoint can be used for logging or token blacklisting if implemented.
    """
    return {"message": "Logged out successfully"}


@router.post("/firebase-login", response_model=Token)
@limiter.limit("10/minute")
async def firebase_login(request: Request, body: FirebaseLoginRequest):
    """
    Authenticate via Firebase ID token.

    Verifies the token with Firebase Admin SDK, then finds or creates a
    matching user profile in MongoDB.  Returns the same ``Token`` envelope
    used by the legacy ``/login`` endpoint so the frontend can handle both
    flows identically.

    - **id_token**: Firebase ID token obtained from the client SDK
    - **full_name**: Display name (only used when creating a new profile)
    - **user_type**: Account type — ``user`` or ``researcher`` (default: ``user``)
    """
    import logging
    logger = logging.getLogger(__name__)

    # 1. Verify the Firebase token
    try:
        from app.services.firebase_service import verify_firebase_token
        decoded = verify_firebase_token(body.id_token)
    except Exception as exc:
        logger.warning("Firebase token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    firebase_uid: str = decoded["uid"]
    email: str = decoded.get("email", "")
    display_name: str = decoded.get("name", "")
    photo_url: str | None = decoded.get("picture")
    email_verified: bool = decoded.get("email_verified", False)

    # Google / OAuth users are always verified; email/password users must verify first.
    sign_in_provider = decoded.get("firebase", {}).get("sign_in_provider", "")
    is_oauth = sign_in_provider in ("google.com", "facebook.com", "github.com", "apple.com")

    if not email_verified and not is_oauth:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox for the verification link.",
        )

    collection = MongoDB.get_collection(Collections.USERS)

    # 2. Find existing user by firebase_uid **or** email
    user = await collection.find_one({"firebase_uid": firebase_uid})
    if not user and email:
        user = await collection.find_one({"email": email})

    from datetime import datetime

    if user:
        # ---- Check if account is banned/deactivated ----
        if not user.get("is_active", True):
            ban_detail = {
                "error": "account_banned",
                "message": "Your account has been deactivated.",
                "reason": user.get("deactivation_reason"),
                "reason_category": user.get("deactivation_category"),
                "is_temporary": user.get("is_temporary_ban", False),
                "duration_days": user.get("ban_duration_days"),
                "deactivated_at": user.get("deactivated_at").isoformat() if user.get("deactivated_at") else None,
            }
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ban_detail,
            )

        # ---- Existing user — update firebase fields if missing ----
        updates: dict = {"updated_at": datetime.utcnow()}
        if not user.get("firebase_uid"):
            updates["firebase_uid"] = firebase_uid
        if photo_url and not user.get("profile_image"):
            updates["profile_image"] = photo_url

        if len(updates) > 1:  # more than just updated_at
            await collection.update_one(
                {"user_id": user["user_id"]}, {"$set": updates}
            )
            user.update(updates)
    else:
        # ---- New user — create profile ----
        user_id = str(uuid.uuid4())
        user = {
            "user_id": user_id,
            "firebase_uid": firebase_uid,
            "email": email,
            "password_hash": "",  # no local password for Firebase-only users
            "full_name": body.full_name or display_name or "User",
            "user_type": body.user_type if body.user_type in ("user", "researcher") else "user",
            "location": None,
            "is_active": True,
            "profile_image": photo_url,
            "created_at": datetime.utcnow(),
            "updated_at": None,
        }
        await collection.insert_one(user)
        logger.info("Created new user from Firebase: uid=%s email=%s", firebase_uid, email)

    # 3. Build a local JWT so legacy endpoints still work (optional)
    token_data = {
        "sub": user["user_id"],
        "email": user["email"],
        "user_type": user.get("user_type", "user"),
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
            user_type=user.get("user_type", "user"),
            location=user.get("location"),
            profile_image=user.get("profile_image"),
            is_active=user.get("is_active", True),
            created_at=user["created_at"],
            updated_at=user.get("updated_at"),
        ),
    )
