import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://chiliscope:chiliscope@cluster0.mkvl1in.mongodb.net/chiliscope?appName=Cluster0")
    db = client["chiliscope"]
    
    # Delete the broken old admin account (no password_hash, no user_type)
    result = await db.users.delete_one({"email": "admin@chiliscan.ph"})
    print(f"Deleted admin@chiliscan.ph: {result.deleted_count}")
    
    # Verify remaining users
    async for u in db.users.find({}, {"email": 1, "user_type": 1, "password_hash": 1, "_id": 0}):
        has_hash = bool(u.get("password_hash"))
        email = u.get("email")
        utype = u.get("user_type", "N/A")
        print(f"  {email} | {utype} | has_hash={has_hash}")
    
    client.close()

asyncio.run(main())
