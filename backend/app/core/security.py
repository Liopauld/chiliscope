"""
Security Utilities
==================

Authentication, password hashing, and JWT token management.
Supports both legacy JWT tokens and Firebase ID tokens.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .config import settings

logger = logging.getLogger(__name__)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode
        expires_delta: Optional expiration time delta
    
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Payload data to encode
    
    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Get current user from token (Firebase ID token **or** legacy JWT).

    Strategy:
      1. Try verifying as a Firebase ID token.
         – On success, look up the user in MongoDB by ``firebase_uid``.
      2. If that fails, fall back to legacy local JWT verification.

    Returns:
        User dict with at least ``user_id``, ``email``, ``user_type``.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

    # ------- 1. Try Firebase ID token -------
    try:
        from app.services.firebase_service import verify_firebase_token
        decoded = verify_firebase_token(token)
        firebase_uid = decoded.get("uid")
        if firebase_uid:
            # Look up user in MongoDB by firebase UID
            from app.core.database import MongoDB, Collections
            collection = MongoDB.get_collection(Collections.USERS)
            user = await collection.find_one({"firebase_uid": firebase_uid})
            if user:
                return {
                    "user_id": user["user_id"],
                    "email": user["email"],
                    "user_type": user.get("user_type", "user"),
                }
            # Firebase token is valid but no matching user in DB yet
            # (e.g. token sent before /firebase-login was called)
            logger.warning("Valid Firebase token but no DB user for uid=%s", firebase_uid)
            raise credentials_exception
    except Exception:
        # Not a valid Firebase token — fall through to legacy JWT
        pass

    # ------- 2. Fall back to legacy JWT -------
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
        
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "user_type": payload.get("user_type")
        }
        
    except (JWTError, HTTPException):
        raise credentials_exception


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get current active user (additional validation).
    
    Args:
        current_user: User from get_current_user dependency
    
    Returns:
        Validated user data
    """
    # Add additional validation if needed (e.g., check if user is_active)
    return current_user


def require_role(required_roles: list):
    """
    Dependency to require specific user roles.
    
    Args:
        required_roles: List of allowed roles
    
    Returns:
        Dependency function
    """
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("user_type") not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    
    return role_checker


# Role-based access dependencies
require_admin = require_role(["admin"])
require_researcher = require_role(["admin", "researcher"])
require_authenticated = require_role(["admin", "researcher", "user"])
