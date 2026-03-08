"""
Forum API Routes
================

Forum posts, comments, reactions, and notifications endpoints.
Authenticated users can post/comment/react. Guests can only read.
"""

from datetime import datetime
from typing import Optional
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel, Field

from app.core.database import MongoDB
from app.core.security import get_current_user, oauth2_scheme
from app.core.cloudinary_service import cloudinary_service
from app.services.profanity_service import profanity_filter
from app.schemas.forum import (
    PostCreate, PostUpdate, PostResponse, PostListResponse, PostAuthor,
    CommentCreate, CommentResponse,
    ReactionCreate, ReactionSummary,
    NotificationResponse, NotificationListResponse,
    PostCategory,
)

forum_logger = logging.getLogger(__name__)

router = APIRouter()

# ── Collections ──
POSTS = "forum_posts"
COMMENTS = "forum_comments"
REACTIONS = "forum_reactions"
NOTIFICATIONS = "notifications"


async def _get_optional_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[dict]:
    """Get current user if authenticated, else None."""
    if not token:
        return None
    try:
        from app.core.security import decode_token
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "user_type": payload.get("user_type"),
        }
    except Exception:
        return None


async def _get_author(user_id: str) -> PostAuthor:
    """Look up user info to build PostAuthor."""
    users = MongoDB.get_collection("users")
    user = await users.find_one({"user_id": user_id})
    if user:
        return PostAuthor(
            user_id=user_id,
            full_name=user.get("full_name", "Unknown"),
            user_type=user.get("user_type", "user"),
        )
    return PostAuthor(user_id=user_id, full_name="Unknown User", user_type="user")


async def _reaction_summary(target_id: str, target_type: str = "post") -> ReactionSummary:
    """Aggregate reaction counts for a post/comment."""
    col = MongoDB.get_collection(REACTIONS)
    pipeline = [
        {"$match": {"target_id": target_id, "target_type": target_type}},
        {"$group": {"_id": "$reaction_type", "count": {"$sum": 1}}},
    ]
    counts = {}
    async for doc in col.aggregate(pipeline):
        counts[doc["_id"]] = doc["count"]
    return ReactionSummary(
        like=counts.get("like", 0),
        love=counts.get("love", 0),
        fire=counts.get("fire", 0),
        insightful=counts.get("insightful", 0),
        hot_take=counts.get("hot_take", 0),
        total=sum(counts.values()),
    )


async def _user_reaction(target_id: str, user_id: Optional[str], target_type: str = "post") -> Optional[str]:
    """Get the user's reaction on a target, if any."""
    if not user_id:
        return None
    col = MongoDB.get_collection(REACTIONS)
    doc = await col.find_one({"target_id": target_id, "target_type": target_type, "user_id": user_id})
    return doc["reaction_type"] if doc else None


async def _create_notification(
    recipient_id: str,
    notif_type: str,
    message: str,
    from_user_id: str,
    post_id: Optional[str] = None,
    comment_id: Optional[str] = None,
):
    """Create a notification document and send FCM push if device tokens exist."""
    if recipient_id == from_user_id:
        return  # Don't notify yourself
    col = MongoDB.get_collection(NOTIFICATIONS)
    author = await _get_author(from_user_id)
    await col.insert_one({
        "notification_id": str(uuid.uuid4()),
        "user_id": recipient_id,
        "type": notif_type,
        "message": message,
        "post_id": post_id,
        "comment_id": comment_id,
        "from_user": author.model_dump(),
        "is_read": False,
        "created_at": datetime.utcnow(),
    })

    # Send FCM push notification
    try:
        users_col = MongoDB.get_collection("users")
        recipient = await users_col.find_one({"user_id": recipient_id})
        fcm_tokens = recipient.get("fcm_tokens", []) if recipient else []
        if fcm_tokens:
            from app.services.firebase_service import send_push_notification
            result = send_push_notification(
                tokens=fcm_tokens,
                title="ChiliScope",
                body=message,
                data={"type": notif_type, "post_id": post_id or "", "comment_id": comment_id or ""},
            )
            # Remove invalid tokens
            if result.get("invalid_tokens"):
                await users_col.update_one(
                    {"user_id": recipient_id},
                    {"$pull": {"fcm_tokens": {"$in": result["invalid_tokens"]}}},
                )
    except Exception as e:
        forum_logger.warning("FCM push failed for %s: %s", recipient_id, e)


async def _notify_all_users_new_post(post_id: str, post_title: str, author_user_id: str):
    """Create in-app notifications AND send FCM push to all users (except author) when a new post is created."""
    try:
        users_col = MongoDB.get_collection("users")
        notif_col = MongoDB.get_collection(NOTIFICATIONS)
        author = await _get_author(author_user_id)
        message = f'{author.full_name} posted: "{post_title[:80]}"'
        now = datetime.utcnow()

        # Query ALL active users excluding the post author
        cursor = users_col.find(
            {"user_id": {"$ne": author_user_id}, "is_active": True},
            {"user_id": 1, "fcm_tokens": 1},
        )

        notification_docs = []
        all_tokens = []
        async for user_doc in cursor:
            notification_docs.append({
                "notification_id": str(uuid.uuid4()),
                "user_id": user_doc["user_id"],
                "type": "new_post",
                "message": message,
                "post_id": post_id,
                "comment_id": None,
                "from_user": author.model_dump(),
                "is_read": False,
                "created_at": now,
            })
            all_tokens.extend(user_doc.get("fcm_tokens", []))

        # Bulk insert notification records
        if notification_docs:
            await notif_col.insert_many(notification_docs)

        # Send FCM push notifications
        if all_tokens:
            from app.services.firebase_service import send_push_notification
            batch_size = 500
            for i in range(0, len(all_tokens), batch_size):
                batch = all_tokens[i : i + batch_size]
                send_push_notification(
                    tokens=batch,
                    title="New Forum Post",
                    body=f"{author.full_name}: {post_title[:80]}",
                    data={"type": "new_post", "post_id": post_id},
                )
    except Exception as e:
        forum_logger.warning("Failed to send new-post notifications: %s", e)


class RegisterDeviceRequest(BaseModel):
    """Schema for registering an FCM device token."""
    token: str = Field(..., min_length=10, max_length=500)


# ════════════════════════════════════════════
# POSTS
# ════════════════════════════════════════════

@router.get("/posts", response_model=PostListResponse)
async def list_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    category: Optional[PostCategory] = None,
    search: Optional[str] = None,
):
    """List forum posts. Public — guests can view."""
    col = MongoDB.get_collection(POSTS)
    query: dict = {}
    if category:
        query["category"] = category.value
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
        ]
    total = await col.count_documents(query)
    cursor = col.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    
    items = []
    async for doc in cursor:
        reactions = await _reaction_summary(doc["post_id"], "post")
        comment_count = await MongoDB.get_collection(COMMENTS).count_documents({"post_id": doc["post_id"]})
        items.append(PostResponse(
            post_id=doc["post_id"],
            title=doc["title"],
            content=doc["content"],
            category=doc["category"],
            tags=doc.get("tags", []),
            images=doc.get("images", []),
            author=PostAuthor(**doc["author"]),
            reactions=reactions,
            comment_count=comment_count,
            created_at=doc["created_at"],
            updated_at=doc.get("updated_at"),
            is_pinned=doc.get("is_pinned", False),
        ))
    return PostListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: str):
    """Get a single post. Public."""
    col = MongoDB.get_collection(POSTS)
    doc = await col.find_one({"post_id": post_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    reactions = await _reaction_summary(post_id, "post")
    comment_count = await MongoDB.get_collection(COMMENTS).count_documents({"post_id": post_id})
    return PostResponse(
        post_id=doc["post_id"],
        title=doc["title"],
        content=doc["content"],
        category=doc["category"],
        tags=doc.get("tags", []),
        images=doc.get("images", []),
        author=PostAuthor(**doc["author"]),
        reactions=reactions,
        comment_count=comment_count,
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at"),
        is_pinned=doc.get("is_pinned", False),
    )


@router.post("/posts", response_model=PostResponse, status_code=201)
async def create_post(data: PostCreate, current_user: dict = Depends(get_current_user)):
    """Create a new post. Authenticated only."""
    # Profanity check on title and content
    profanity_filter.validate_or_raise(data.title, field_name="title")
    profanity_filter.validate_or_raise(data.content, field_name="content")

    col = MongoDB.get_collection(POSTS)
    author = await _get_author(current_user["user_id"])
    post_id = str(uuid.uuid4())
    doc = {
        "post_id": post_id,
        "title": data.title,
        "content": data.content,
        "category": data.category.value,
        "tags": data.tags,
        "images": data.images,
        "author": author.model_dump(),
        "is_pinned": False,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }
    await col.insert_one(doc)

    # Send push notification to all users about new post
    await _notify_all_users_new_post(post_id, data.title, current_user["user_id"])

    return PostResponse(
        post_id=post_id,
        title=data.title,
        content=data.content,
        category=data.category,
        tags=data.tags,
        images=data.images,
        author=author,
        reactions=ReactionSummary(),
        comment_count=0,
        created_at=doc["created_at"],
        is_pinned=False,
    )


@router.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(post_id: str, data: PostUpdate, current_user: dict = Depends(get_current_user)):
    """Update own post (or admin can update any)."""
    col = MongoDB.get_collection(POSTS)
    doc = await col.find_one({"post_id": post_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    if doc["author"]["user_id"] != current_user["user_id"] and current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    # Profanity check on updated fields
    if data.title is not None:
        profanity_filter.validate_or_raise(data.title, field_name="title")
    if data.content is not None:
        profanity_filter.validate_or_raise(data.content, field_name="content")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data.get("category"):
        update_data["category"] = update_data["category"].value if hasattr(update_data["category"], "value") else update_data["category"]
    update_data["updated_at"] = datetime.utcnow()
    await col.update_one({"post_id": post_id}, {"$set": update_data})
    return await get_post(post_id)


@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete own post (or admin can delete any)."""
    col = MongoDB.get_collection(POSTS)
    doc = await col.find_one({"post_id": post_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    if doc["author"]["user_id"] != current_user["user_id"] and current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await col.delete_one({"post_id": post_id})
    await MongoDB.get_collection(COMMENTS).delete_many({"post_id": post_id})
    await MongoDB.get_collection(REACTIONS).delete_many({"target_id": post_id})


# ════════════════════════════════════════════
# COMMENTS
# ════════════════════════════════════════════

@router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
async def list_comments(post_id: str):
    """List comments for a post. Public."""
    col = MongoDB.get_collection(COMMENTS)
    cursor = col.find({"post_id": post_id, "parent_id": None}).sort("created_at", 1)
    
    comments = []
    async for doc in cursor:
        reactions = await _reaction_summary(doc["comment_id"], "comment")
        # Fetch replies
        reply_cursor = col.find({"parent_id": doc["comment_id"]}).sort("created_at", 1)
        replies = []
        async for reply in reply_cursor:
            r_reactions = await _reaction_summary(reply["comment_id"], "comment")
            replies.append(CommentResponse(
                comment_id=reply["comment_id"],
                post_id=reply["post_id"],
                content=reply["content"],
                author=PostAuthor(**reply["author"]),
                parent_id=reply.get("parent_id"),
                reactions=r_reactions,
                created_at=reply["created_at"],
            ))
        comments.append(CommentResponse(
            comment_id=doc["comment_id"],
            post_id=doc["post_id"],
            content=doc["content"],
            author=PostAuthor(**doc["author"]),
            parent_id=None,
            reactions=reactions,
            replies=replies,
            created_at=doc["created_at"],
        ))
    return comments


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(post_id: str, data: CommentCreate, current_user: dict = Depends(get_current_user)):
    """Add a comment. Authenticated only."""
    # Profanity check
    profanity_filter.validate_or_raise(data.content, field_name="comment")

    posts_col = MongoDB.get_collection(POSTS)
    post = await posts_col.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    author = await _get_author(current_user["user_id"])
    comment_id = str(uuid.uuid4())
    doc = {
        "comment_id": comment_id,
        "post_id": post_id,
        "content": data.content,
        "author": author.model_dump(),
        "parent_id": data.parent_id,
        "created_at": datetime.utcnow(),
    }
    await MongoDB.get_collection(COMMENTS).insert_one(doc)
    
    # Notify post author about new comment
    await _create_notification(
        recipient_id=post["author"]["user_id"],
        notif_type="post_comment",
        message=f"{author.full_name} commented on your post \"{post['title'][:50]}\"",
        from_user_id=current_user["user_id"],
        post_id=post_id,
        comment_id=comment_id,
    )
    
    # If replying, notify parent comment author
    if data.parent_id:
        parent = await MongoDB.get_collection(COMMENTS).find_one({"comment_id": data.parent_id})
        if parent:
            await _create_notification(
                recipient_id=parent["author"]["user_id"],
                notif_type="comment_reply",
                message=f"{author.full_name} replied to your comment",
                from_user_id=current_user["user_id"],
                post_id=post_id,
                comment_id=comment_id,
            )
    
    return CommentResponse(
        comment_id=comment_id,
        post_id=post_id,
        content=data.content,
        author=author,
        parent_id=data.parent_id,
        reactions=ReactionSummary(),
        created_at=doc["created_at"],
    )


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete own comment (or admin)."""
    col = MongoDB.get_collection(COMMENTS)
    doc = await col.find_one({"comment_id": comment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Comment not found")
    if doc["author"]["user_id"] != current_user["user_id"] and current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await col.delete_one({"comment_id": comment_id})
    # Delete replies
    await col.delete_many({"parent_id": comment_id})


# ════════════════════════════════════════════
# REACTIONS
# ════════════════════════════════════════════

@router.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, data: ReactionCreate, current_user: dict = Depends(get_current_user)):
    """React to a post. Toggle: same reaction removes it."""
    col = MongoDB.get_collection(REACTIONS)
    existing = await col.find_one({
        "target_id": post_id, "target_type": "post", "user_id": current_user["user_id"]
    })
    
    if existing:
        if existing["reaction_type"] == data.reaction_type.value:
            await col.delete_one({"_id": existing["_id"]})
            return {"action": "removed", "reaction_type": data.reaction_type.value}
        else:
            await col.update_one({"_id": existing["_id"]}, {"$set": {"reaction_type": data.reaction_type.value}})
            return {"action": "changed", "reaction_type": data.reaction_type.value}
    
    await col.insert_one({
        "reaction_id": str(uuid.uuid4()),
        "target_id": post_id,
        "target_type": "post",
        "reaction_type": data.reaction_type.value,
        "user_id": current_user["user_id"],
        "created_at": datetime.utcnow(),
    })
    
    # Notify post author
    post = await MongoDB.get_collection(POSTS).find_one({"post_id": post_id})
    if post:
        author = await _get_author(current_user["user_id"])
        emoji_map = {"like": "👍", "love": "❤️", "fire": "🔥", "insightful": "💡", "hot_take": "🌶️"}
        emoji = emoji_map.get(data.reaction_type.value, "👍")
        await _create_notification(
            recipient_id=post["author"]["user_id"],
            notif_type="post_reaction",
            message=f"{author.full_name} reacted {emoji} to your post \"{post['title'][:50]}\"",
            from_user_id=current_user["user_id"],
            post_id=post_id,
        )
    
    return {"action": "added", "reaction_type": data.reaction_type.value}


@router.post("/comments/{comment_id}/react")
async def react_to_comment(comment_id: str, data: ReactionCreate, current_user: dict = Depends(get_current_user)):
    """React to a comment. Toggle: same reaction removes it."""
    col = MongoDB.get_collection(REACTIONS)
    existing = await col.find_one({
        "target_id": comment_id, "target_type": "comment", "user_id": current_user["user_id"]
    })
    
    if existing:
        if existing["reaction_type"] == data.reaction_type.value:
            await col.delete_one({"_id": existing["_id"]})
            return {"action": "removed", "reaction_type": data.reaction_type.value}
        else:
            await col.update_one({"_id": existing["_id"]}, {"$set": {"reaction_type": data.reaction_type.value}})
            return {"action": "changed", "reaction_type": data.reaction_type.value}
    
    await col.insert_one({
        "reaction_id": str(uuid.uuid4()),
        "target_id": comment_id,
        "target_type": "comment",
        "reaction_type": data.reaction_type.value,
        "user_id": current_user["user_id"],
        "created_at": datetime.utcnow(),
    })
    
    # Notify comment author
    comment = await MongoDB.get_collection(COMMENTS).find_one({"comment_id": comment_id})
    if comment:
        author = await _get_author(current_user["user_id"])
        await _create_notification(
            recipient_id=comment["author"]["user_id"],
            notif_type="comment_reaction",
            message=f"{author.full_name} reacted to your comment",
            from_user_id=current_user["user_id"],
            post_id=comment.get("post_id"),
            comment_id=comment_id,
        )
    
    return {"action": "added", "reaction_type": data.reaction_type.value}


# ════════════════════════════════════════════
# NOTIFICATIONS
# ════════════════════════════════════════════

@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Get notifications for the current user."""
    col = MongoDB.get_collection(NOTIFICATIONS)
    query = {"user_id": current_user["user_id"]}
    total = await col.count_documents(query)
    unread = await col.count_documents({**query, "is_read": False})
    cursor = col.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    
    items = []
    async for doc in cursor:
        items.append(NotificationResponse(
            notification_id=doc["notification_id"],
            type=doc["type"],
            message=doc["message"],
            post_id=doc.get("post_id"),
            comment_id=doc.get("comment_id"),
            from_user=PostAuthor(**doc["from_user"]),
            is_read=doc["is_read"],
            created_at=doc["created_at"],
        ))
    return NotificationListResponse(items=items, total=total, unread_count=unread)


@router.get("/notifications/unread-count")
async def unread_notification_count(current_user: dict = Depends(get_current_user)):
    """Get unread notification count."""
    col = MongoDB.get_collection(NOTIFICATIONS)
    count = await col.count_documents({"user_id": current_user["user_id"], "is_read": False})
    return {"unread_count": count}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read."""
    col = MongoDB.get_collection(NOTIFICATIONS)
    result = await col.update_one(
        {"notification_id": notification_id, "user_id": current_user["user_id"]},
        {"$set": {"is_read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "ok"}


@router.put("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read."""
    col = MongoDB.get_collection(NOTIFICATIONS)
    await col.update_many(
        {"user_id": current_user["user_id"], "is_read": False},
        {"$set": {"is_read": True}},
    )
    return {"status": "ok"}


# ════════════════════════════════════════════
# DEVICE TOKEN REGISTRATION (FCM)
# ════════════════════════════════════════════

@router.post("/notifications/register-device")
async def register_device_token(
    body: RegisterDeviceRequest,
    current_user: dict = Depends(get_current_user),
):
    """Register an FCM device token for push notifications."""
    users_col = MongoDB.get_collection("users")
    # Add token to array (avoid duplicates)
    await users_col.update_one(
        {"user_id": current_user["user_id"]},
        {"$addToSet": {"fcm_tokens": body.token}},
    )
    return {"status": "ok", "message": "Device registered for push notifications"}


@router.delete("/notifications/unregister-device")
async def unregister_device_token(
    body: RegisterDeviceRequest,
    current_user: dict = Depends(get_current_user),
):
    """Remove an FCM device token."""
    users_col = MongoDB.get_collection("users")
    await users_col.update_one(
        {"user_id": current_user["user_id"]},
        {"$pull": {"fcm_tokens": body.token}},
    )
    return {"status": "ok", "message": "Device unregistered"}


# ── Image Upload ──

@router.post("/upload-image")
async def upload_forum_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload an image to Cloudinary for forum posts.
    Returns the Cloudinary URL to be used in post creation.
    """
    # Upload to Cloudinary with forum-specific folder and tags
    result = await cloudinary_service.upload_image(
        file=file,
        folder=f"chiliscope/forum/{current_user['user_id']}",
        tags=["forum", current_user["user_id"]],
    )
    
    return {
        "url": result["url"],
        "public_id": result["public_id"],
        "width": result["width"],
        "height": result["height"],
    }
