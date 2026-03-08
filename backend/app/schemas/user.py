"""
User Schemas
============

Pydantic models for user authentication and management.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class UserType(str, Enum):
    """User type enumeration."""
    USER = "user"  # Standard user (previously farmer/gardener)
    RESEARCHER = "researcher"  # Extended access to analytics
    ADMIN = "admin"  # Full system access


class LocationSchema(BaseModel):
    """Geographic location schema."""
    region: Optional[str] = None
    province: Optional[str] = None
    municipality: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: str
    full_name: str = Field(..., min_length=2, max_length=100)
    user_type: UserType = UserType.USER
    location: Optional[LocationSchema] = None


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    
    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "password" in values and v != values["password"]:
            raise ValueError("Passwords do not match")
        return v
    
    @validator("password")
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str
    password: str


class LoginForm(BaseModel):
    """Custom login form to replace OAuth2PasswordRequestForm."""
    username: str  # This will be the email
    password: str


class UserUpdate(BaseModel):
    """Schema for user profile update."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    location: Optional[LocationSchema] = None
    profile_image: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user response (excludes password)."""
    user_id: str
    email: str
    full_name: str
    user_type: UserType
    location: Optional[LocationSchema] = None
    profile_image: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserInDB(UserBase):
    """Schema for user stored in database."""
    user_id: str
    password_hash: str
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    profile_image: Optional[str] = None


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserResponse


class TokenPayload(BaseModel):
    """JWT token payload schema."""
    sub: str  # user_id
    email: str
    user_type: str
    exp: datetime
    iat: datetime
    type: str  # access or refresh


class PasswordChange(BaseModel):
    """Schema for password change."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str
    
    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class PasswordReset(BaseModel):
    """Schema for password reset request."""
    email: str


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str
    
    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class FirebaseLoginRequest(BaseModel):
    """Schema for Firebase ID-token based login / registration."""
    id_token: str = Field(..., description="Firebase ID token from the client SDK")
    full_name: Optional[str] = Field(None, description="Display name (used when creating a new profile)")
    user_type: str = Field("user", description="Account type: user | researcher")
