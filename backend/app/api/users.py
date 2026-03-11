"""
Users Routes
============

User profile management endpoints.
"""

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.database import MongoDB, Collections
from app.core.security import get_current_user, require_admin
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


class DeactivateUserRequest(BaseModel):
    """Schema for banning/deactivating a user."""
    reason: str = Field(..., min_length=1, max_length=500)
    reason_category: str = Field(
        ...,
        description="Predefined reason category",
    )
    is_temporary: bool = False
    duration_days: Optional[int] = Field(None, ge=1, le=365)


class ReactivateUserRequest(BaseModel):
    """Schema for reactivating a user."""
    note: Optional[str] = Field(None, max_length=500)


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile."""
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


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile."""
    collection = MongoDB.get_collection(Collections.USERS)
    
    # Build update document
    update_doc = {"updated_at": datetime.utcnow()}
    
    if update_data.full_name:
        update_doc["full_name"] = update_data.full_name
    if update_data.location:
        update_doc["location"] = update_data.location.model_dump()
    if update_data.profile_image:
        update_doc["profile_image"] = update_data.profile_image
    
    result = await collection.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": update_doc}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Return updated user
    user = await collection.find_one({"user_id": current_user["user_id"]})
    
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


@router.get("/me/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get current user's usage statistics."""
    samples_collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    # Count user's samples
    total_samples = await samples_collection.count_documents(
        {"user_id": current_user["user_id"]}
    )
    
    # Count by variety
    variety_pipeline = [
        {"$match": {"user_id": current_user["user_id"]}},
        {"$group": {"_id": "$variety", "count": {"$sum": 1}}}
    ]
    variety_counts = await samples_collection.aggregate(variety_pipeline).to_list(10)
    
    # Get average confidence
    confidence_pipeline = [
        {"$match": {"user_id": current_user["user_id"]}},
        {"$group": {
            "_id": None,
            "avg_confidence": {"$avg": "$predictions.variety_classification.confidence"}
        }}
    ]
    confidence_result = await samples_collection.aggregate(confidence_pipeline).to_list(1)
    
    avg_confidence = confidence_result[0]["avg_confidence"] if confidence_result else None
    
    return {
        "total_samples": total_samples,
        "samples_by_variety": {item["_id"]: item["count"] for item in variety_counts if item["_id"]},
        "average_confidence": round(avg_confidence * 100, 1) if avg_confidence else None
    }


@router.get("/{user_id}")
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """Get user by ID with full details (admin only)."""
    collection = MongoDB.get_collection(Collections.USERS)
    samples_collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    user = await collection.find_one({"user_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Count user's analyses
    total_analyses = await samples_collection.count_documents({"user_id": user_id})
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "user_type": user["user_type"],
        "location": user.get("location"),
        "profile_image": user.get("profile_image"),
        "is_active": user.get("is_active", True),
        "created_at": user["created_at"],
        "updated_at": user.get("updated_at"),
        "total_analyses": total_analyses,
        "deactivation_reason": user.get("deactivation_reason"),
        "deactivation_category": user.get("deactivation_category"),
        "deactivated_at": user.get("deactivated_at"),
        "deactivated_by": user.get("deactivated_by"),
        "is_temporary_ban": user.get("is_temporary_ban", False),
        "ban_duration_days": user.get("ban_duration_days"),
        "reactivation_note": user.get("reactivation_note"),
        "reactivated_at": user.get("reactivated_at"),
    }


@router.get("", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 20,
    user_type: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """List all users (admin only)."""
    collection = MongoDB.get_collection(Collections.USERS)
    
    # Build query
    query = {}
    if user_type:
        query["user_type"] = user_type
    
    cursor = collection.find(query).skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    
    return [
        UserResponse(
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
        for user in users
    ]


@router.put("/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    body: DeactivateUserRequest,
    current_user: dict = Depends(require_admin)
):
    """Ban/Deactivate a user with a reason (admin only). Soft delete — does not remove data."""
    collection = MongoDB.get_collection(Collections.USERS)
    
    # Prevent self-deactivation
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    # Check target exists and isn't already deactivated
    target_user = await collection.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not target_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already deactivated"
        )
    
    update_doc = {
        "is_active": False,
        "deactivation_reason": body.reason,
        "deactivation_category": body.reason_category,
        "deactivated_at": datetime.utcnow(),
        "deactivated_by": current_user["user_id"],
        "is_temporary_ban": body.is_temporary,
        "updated_at": datetime.utcnow(),
    }
    
    if body.is_temporary and body.duration_days:
        update_doc["ban_duration_days"] = body.duration_days
    
    result = await collection.update_one(
        {"user_id": user_id},
        {"$set": update_doc}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user"
        )
    
    # Send ban notification email
    try:
        from app.services.email_service import send_ban_notification_email
        send_ban_notification_email(
            to_email=target_user["email"],
            full_name=target_user.get("full_name", "User"),
            reason=body.reason,
            reason_category=body.reason_category,
            is_temporary=body.is_temporary,
            duration_days=body.duration_days,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to send ban email: %s", e)
    
    return {
        "message": f"User {target_user['full_name']} has been deactivated",
        "reason": body.reason,
        "reason_category": body.reason_category,
        "is_temporary": body.is_temporary,
        "duration_days": body.duration_days,
    }


@router.put("/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    body: ReactivateUserRequest = None,
    current_user: dict = Depends(require_admin)
):
    """Reactivate a previously deactivated user (admin only)."""
    collection = MongoDB.get_collection(Collections.USERS)
    
    target_user = await collection.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if target_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )
    
    update_doc = {
        "is_active": True,
        "reactivated_at": datetime.utcnow(),
        "reactivation_note": body.note if body else None,
        "updated_at": datetime.utcnow(),
        # Clear ban fields
        "deactivation_reason": None,
        "deactivation_category": None,
        "deactivated_at": None,
        "deactivated_by": None,
        "is_temporary_ban": False,
        "ban_duration_days": None,
    }
    
    await collection.update_one(
        {"user_id": user_id},
        {"$set": update_doc}
    )
    
    return {"message": f"User {target_user['full_name']} has been reactivated"}
