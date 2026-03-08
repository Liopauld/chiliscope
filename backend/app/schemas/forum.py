"""
Forum Schemas
=============

Pydantic models for Forum posts, comments, reactions, and notifications.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ReactionType(str, Enum):
    like = "like"
    love = "love"
    fire = "fire"
    insightful = "insightful"
    hot_take = "hot_take"


class PostCategory(str, Enum):
    general = "general"
    research = "research"
    identification = "identification"
    cultivation = "cultivation"
    recipes = "recipes"
    marketplace = "marketplace"
    announcements = "announcements"


# ── Posts ──

class PostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10, max_length=5000)
    category: PostCategory = PostCategory.general
    tags: List[str] = []
    images: List[str] = []  # List of Cloudinary URLs


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    content: Optional[str] = Field(None, min_length=10, max_length=5000)
    category: Optional[PostCategory] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None  # List of Cloudinary URLs


class PostAuthor(BaseModel):
    user_id: str
    full_name: str
    user_type: str


class ReactionSummary(BaseModel):
    like: int = 0
    love: int = 0
    fire: int = 0
    insightful: int = 0
    hot_take: int = 0
    total: int = 0


class PostResponse(BaseModel):
    post_id: str
    title: str
    content: str
    category: PostCategory
    tags: List[str] = []
    images: List[str] = []  # List of Cloudinary URLs
    author: PostAuthor
    reactions: ReactionSummary = ReactionSummary()
    user_reaction: Optional[str] = None
    comment_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_pinned: bool = False


class PostListResponse(BaseModel):
    items: List[PostResponse]
    total: int
    page: int
    limit: int


# ── Comments ──

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[str] = None  # For nested replies


class CommentResponse(BaseModel):
    comment_id: str
    post_id: str
    content: str
    author: PostAuthor
    parent_id: Optional[str] = None
    reactions: ReactionSummary = ReactionSummary()
    user_reaction: Optional[str] = None
    created_at: datetime
    replies: List["CommentResponse"] = []


# ── Reactions ──

class ReactionCreate(BaseModel):
    reaction_type: ReactionType


# ── Notifications ──

class NotificationType(str, Enum):
    post_reaction = "post_reaction"
    post_comment = "post_comment"
    comment_reaction = "comment_reaction"
    comment_reply = "comment_reply"
    mention = "mention"
    new_post = "new_post"


class NotificationResponse(BaseModel):
    notification_id: str
    type: NotificationType
    message: str
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    from_user: PostAuthor
    is_read: bool = False
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    unread_count: int
