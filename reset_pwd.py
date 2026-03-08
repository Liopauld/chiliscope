"""Reset admin password for testing."""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient

async def reset():
    client = AsyncIOMotorClient("mongodb+srv://chiliscope:chiliscope@cluster0.mkvl1in.mongodb.net/chiliscope")
    db = client["chiliscope"]
    hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    result = await db.users.update_one(
        {"email": "admin@chiliscope.com"},
        {"$set": {"password_hash": hashed}}
    )
    print(f"Modified: {result.modified_count}")
    print(f"Hash: {hashed}")
    client.close()

asyncio.run(reset())
