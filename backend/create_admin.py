"""
Create Admin Account Script
============================
Inserts an admin user directly into MongoDB Atlas.
"""

import asyncio
import uuid
from datetime import datetime

import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb+srv://chiliscope:chiliscope@cluster0.mkvl1in.mongodb.net/chiliscope?appName=Cluster0"
DATABASE_NAME = "chiliscope"

# --- Admin credentials ---
ADMIN_EMAIL = "admin@chiliscope.com"
ADMIN_PASSWORD = "Admin@2026"
ADMIN_NAME = "ChiliScope Admin"


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


async def main():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    collection = db["users"]

    # Check if admin already exists
    existing = await collection.find_one({"email": ADMIN_EMAIL})
    if existing:
        print(f"Admin account already exists: {ADMIN_EMAIL}")
        client.close()
        return

    user_id = str(uuid.uuid4())
    admin_doc = {
        "user_id": user_id,
        "email": ADMIN_EMAIL,
        "password_hash": hash_password(ADMIN_PASSWORD),
        "full_name": ADMIN_NAME,
        "user_type": "admin",
        "location": None,
        "is_active": True,
        "profile_image": None,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }

    await collection.insert_one(admin_doc)
    print("=" * 50)
    print("Admin account created successfully!")
    print(f"  Email:    {ADMIN_EMAIL}")
    print(f"  Password: {ADMIN_PASSWORD}")
    print(f"  Role:     admin")
    print(f"  User ID:  {user_id}")
    print("=" * 50)

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
