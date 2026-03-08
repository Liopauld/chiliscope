"""
MongoDB Atlas Database Initialization Script
=============================================

This script initializes the ChiliScan database with:
- Required collections
- Indexes for optimal query performance
- Sample data for development/testing
"""

import asyncio
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "chiliscan")

# Chili variety reference data
CHILI_VARIETIES = [
    {
        "variety_id": "siling_haba",
        "name": "Siling Haba",
        "scientific_name": "Capsicum annuum var. longum",
        "common_names": ["Long Pepper", "Finger Chili", "Siling Pangsigang"],
        "description": "A long, slender chili pepper commonly used in Filipino cooking. Known for its mild to medium heat and is often used in stews and stir-fries.",
        "origin": "Philippines",
        "typical_shu_range": {"min": 5000, "max": 15000},
        "heat_category": "Mild to Medium",
        "culinary_uses": [
            "Sinigang (sour soup)",
            "Pinakbet",
            "Stir-fries",
            "Pickling"
        ],
        "growing_conditions": {
            "temperature": "25-30°C",
            "humidity": "60-80%",
            "soil_ph": "6.0-6.8"
        },
        "flower_characteristics": {
            "color": "White to pale purple",
            "petal_count": 5,
            "typical_size_mm": 15
        },
        "image_url": "/images/varieties/siling_haba.jpg",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    },
    {
        "variety_id": "siling_labuyo",
        "name": "Siling Labuyo",
        "scientific_name": "Capsicum frutescens",
        "common_names": ["Bird's Eye Chili", "Thai Chili", "Wild Chili"],
        "description": "A small but very hot chili pepper native to the Philippines. Despite its small size, it packs significant heat and is widely used in Filipino cuisine.",
        "origin": "Philippines",
        "typical_shu_range": {"min": 80000, "max": 100000},
        "heat_category": "Hot to Extra Hot",
        "culinary_uses": [
            "Spiced vinegar (sukang may sili)",
            "Hot sauce",
            "Bicol Express",
            "Laing"
        ],
        "growing_conditions": {
            "temperature": "25-35°C",
            "humidity": "50-70%",
            "soil_ph": "5.5-7.0"
        },
        "flower_characteristics": {
            "color": "White with purple tinge",
            "petal_count": 5,
            "typical_size_mm": 10
        },
        "image_url": "/images/varieties/siling_labuyo.jpg",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    },
    {
        "variety_id": "siling_demonyo",
        "name": "Siling Demonyo",
        "scientific_name": "Capsicum chinense x frutescens",
        "common_names": ["Demon Chili", "Philippine Demon Pepper"],
        "description": "Siling Demonyo (Demon Chili) is a fiery hybrid variety known for its extreme heat. It is one of the hottest chilies cultivated in the Philippines.",
        "origin": "Philippines (Cultivated)",
        "typical_shu_range": {"min": 100000, "max": 350000},
        "heat_category": "Extra Hot",
        "culinary_uses": [
            "Hot sauce production",
            "Extreme spice dishes",
            "Chili oil",
            "Specialty condiments"
        ],
        "growing_conditions": {
            "temperature": "28-35°C",
            "humidity": "50-65%",
            "soil_ph": "6.0-7.0"
        },
        "flower_characteristics": {
            "color": "White to cream",
            "petal_count": 5,
            "typical_size_mm": 12
        },
        "image_url": "/images/varieties/siling_demonyo.jpg",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
]

# Heat level categories
HEAT_CATEGORIES = [
    {
        "category_id": "mild",
        "name": "Mild",
        "shu_min": 0,
        "shu_max": 5000,
        "color": "#4caf50",
        "description": "Gentle heat suitable for everyday cooking",
        "icon": "🌶️"
    },
    {
        "category_id": "medium",
        "name": "Medium",
        "shu_min": 5001,
        "shu_max": 15000,
        "color": "#ff9800",
        "description": "Noticeable heat with pleasant warmth",
        "icon": "🌶️🌶️"
    },
    {
        "category_id": "hot",
        "name": "Hot",
        "shu_min": 15001,
        "shu_max": 50000,
        "color": "#f44336",
        "description": "Significant heat for spice enthusiasts",
        "icon": "🌶️🌶️🌶️"
    },
    {
        "category_id": "extra_hot",
        "name": "Extra Hot",
        "shu_min": 50001,
        "shu_max": 500000,
        "color": "#b71c1c",
        "description": "Extreme heat - handle with caution",
        "icon": "🌶️🌶️🌶️🌶️"
    }
]


async def init_database():
    """Initialize the MongoDB Atlas database."""
    print("=" * 60)
    print("ChiliScan Database Initialization")
    print("=" * 60)
    
    # Check if using Atlas
    is_atlas = MONGODB_URL.startswith("mongodb+srv")
    
    try:
        print(f"\n📡 Connecting to MongoDB {'Atlas' if is_atlas else 'Local'}...")
        
        if is_atlas:
            client = AsyncIOMotorClient(
                MONGODB_URL,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=10000
            )
        else:
            client = AsyncIOMotorClient(
                MONGODB_URL,
                serverSelectionTimeoutMS=10000
            )
        
        # Test connection
        await client.admin.command('ping')
        print("✓ Connected successfully!")
        
        db = client[DATABASE_NAME]
        
        # Create collections
        print(f"\n📁 Setting up database: {DATABASE_NAME}")
        
        collections = [
            "users",
            "chili_samples",
            "chili_varieties",
            "heat_categories",
            "ml_models",
            "recommendations",
            "analytics",
            "images"
        ]
        
        existing_collections = await db.list_collection_names()
        
        for coll_name in collections:
            if coll_name not in existing_collections:
                await db.create_collection(coll_name)
                print(f"  ✓ Created collection: {coll_name}")
            else:
                print(f"  • Collection exists: {coll_name}")
        
        # Create indexes
        print("\n🔍 Creating indexes...")
        
        # Users indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        print("  ✓ Users indexes created")
        
        # Chili samples indexes
        await db.chili_samples.create_index("sample_id", unique=True)
        await db.chili_samples.create_index("user_id")
        await db.chili_samples.create_index("variety")
        await db.chili_samples.create_index("created_at")
        await db.chili_samples.create_index([
            ("predictions.heat_level.heat_category", 1),
            ("variety", 1)
        ])
        print("  ✓ Chili samples indexes created")
        
        # Varieties indexes
        await db.chili_varieties.create_index("variety_id", unique=True)
        await db.chili_varieties.create_index("name")
        print("  ✓ Chili varieties indexes created")
        
        # Heat categories indexes
        await db.heat_categories.create_index("category_id", unique=True)
        print("  ✓ Heat categories indexes created")
        
        # ML models indexes
        await db.ml_models.create_index("model_id", unique=True)
        await db.ml_models.create_index("model_type")
        await db.ml_models.create_index("is_active")
        print("  ✓ ML models indexes created")
        
        # Insert reference data
        print("\n📊 Inserting reference data...")
        
        # Insert chili varieties
        for variety in CHILI_VARIETIES:
            try:
                await db.chili_varieties.update_one(
                    {"variety_id": variety["variety_id"]},
                    {"$set": variety},
                    upsert=True
                )
            except Exception as e:
                print(f"  ! Warning for variety {variety['name']}: {e}")
        print(f"  ✓ Inserted {len(CHILI_VARIETIES)} chili varieties")
        
        # Insert heat categories
        for category in HEAT_CATEGORIES:
            try:
                await db.heat_categories.update_one(
                    {"category_id": category["category_id"]},
                    {"$set": category},
                    upsert=True
                )
            except Exception as e:
                print(f"  ! Warning for category {category['name']}: {e}")
        print(f"  ✓ Inserted {len(HEAT_CATEGORIES)} heat categories")
        
        # Create sample admin user (for development)
        admin_user = {
            "user_id": "admin_001",
            "email": "admin@chiliscan.ph",
            "name": "System Admin",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        try:
            await db.users.update_one(
                {"email": admin_user["email"]},
                {"$set": admin_user},
                upsert=True
            )
            print("  ✓ Admin user created/updated")
        except Exception as e:
            print(f"  ! Admin user warning: {e}")
        
        # Get collection stats
        print("\n📈 Database Statistics:")
        for coll_name in collections:
            count = await db[coll_name].count_documents({})
            print(f"  • {coll_name}: {count} documents")
        
        # Close connection
        client.close()
        
        print("\n" + "=" * 60)
        print("✓ Database initialization complete!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error initializing database: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check your MONGODB_URL in .env file")
        print("2. Ensure your IP is whitelisted in MongoDB Atlas")
        print("3. Verify username and password are correct")
        print("4. Check network connectivity")
        return False


async def test_connection():
    """Test MongoDB connection without initialization."""
    print("Testing MongoDB connection...")
    
    is_atlas = MONGODB_URL.startswith("mongodb+srv")
    
    try:
        if is_atlas:
            client = AsyncIOMotorClient(
                MONGODB_URL,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=5000
            )
        else:
            client = AsyncIOMotorClient(
                MONGODB_URL,
                serverSelectionTimeoutMS=5000
            )
        
        await client.admin.command('ping')
        print("✓ Connection successful!")
        
        # List databases
        databases = await client.list_database_names()
        print(f"\nAvailable databases: {', '.join(databases)}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="ChiliScan Database Initialization")
    parser.add_argument("--test", action="store_true", help="Test connection only")
    args = parser.parse_args()
    
    if args.test:
        asyncio.run(test_connection())
    else:
        asyncio.run(init_database())
