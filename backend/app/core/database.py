"""
MongoDB Database Configuration
==============================

Async MongoDB connection using Motor driver.
Supports both local MongoDB and MongoDB Atlas.
Provides database access for FastAPI application.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging
import certifi

from .config import settings

logger = logging.getLogger(__name__)


class MongoDB:
    """MongoDB connection manager with Atlas support."""
    
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None
    
    @classmethod
    async def connect(cls) -> None:
        """Establish connection to MongoDB (local or Atlas)."""
        try:
            # Check if using MongoDB Atlas (connection string contains mongodb+srv)
            is_atlas = settings.mongodb_url.startswith("mongodb+srv")
            
            if is_atlas:
                # MongoDB Atlas requires SSL/TLS with certifi
                cls.client = AsyncIOMotorClient(
                    settings.mongodb_url,
                    tlsCAFile=certifi.where(),
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000,
                    retryWrites=True
                )
                logger.info("Connecting to MongoDB Atlas...")
            else:
                # Local MongoDB
                cls.client = AsyncIOMotorClient(
                    settings.mongodb_url,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000
                )
                logger.info("Connecting to local MongoDB...")
            
            cls.database = cls.client[settings.database_name]
            
            # Verify connection
            await cls.client.admin.command('ping')
            logger.info(f"✓ Connected to MongoDB: {settings.database_name}")
            
            # Create indexes
            await cls._create_indexes()
            
        except Exception as e:
            logger.error(f"✗ Failed to connect to MongoDB: {e}")
            raise
    
    @classmethod
    async def disconnect(cls) -> None:
        """Close MongoDB connection."""
        if cls.client:
            cls.client.close()
            logger.info("Disconnected from MongoDB")
    
    @classmethod
    async def _create_indexes(cls) -> None:
        """Create database indexes for better query performance."""
        try:
            # Users collection indexes
            await cls.database.users.create_index("email", unique=True)
            await cls.database.users.create_index("user_id", unique=True)
            await cls.database.users.create_index("firebase_uid", unique=True, sparse=True)
            
            # Chili samples collection indexes
            await cls.database.chili_samples.create_index("sample_id", unique=True)
            await cls.database.chili_samples.create_index("user_id")
            await cls.database.chili_samples.create_index("variety")
            await cls.database.chili_samples.create_index("created_at")
            await cls.database.chili_samples.create_index([
                ("predictions.heat_level.heat_category", 1),
                ("variety", 1)
            ])
            
            # ML Models collection indexes
            await cls.database.ml_models.create_index("model_id", unique=True)
            await cls.database.ml_models.create_index("model_type")
            await cls.database.ml_models.create_index("is_active")
            
            # Recommendations collection indexes
            await cls.database.recommendations.create_index("recommendation_id", unique=True)
            await cls.database.recommendations.create_index("sample_id")
            await cls.database.recommendations.create_index("user_id")
            
            # Analytics collection indexes
            await cls.database.analytics.create_index("date")
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")
    
    @classmethod
    def get_collection(cls, collection_name: str):
        """Get a collection from the database."""
        if cls.database is None:
            raise RuntimeError("Database not connected")
        return cls.database[collection_name]


async def get_database() -> AsyncIOMotorDatabase:
    """Dependency to get database instance."""
    if MongoDB.database is None:
        await MongoDB.connect()
    return MongoDB.database


# Collection name constants
class Collections:
    """MongoDB collection names."""
    USERS = "users"
    CHILI_SAMPLES = "chili_samples"
    ML_MODELS = "ml_models"
    RECOMMENDATIONS = "recommendations"
    ANALYTICS = "analytics"
    IMAGES = "images"
