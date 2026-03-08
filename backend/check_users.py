import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb+srv://chiliscope:chiliscope@cluster0.mkvl1in.mongodb.net/chiliscope?appName=Cluster0")
    db = client["chiliscope"]
    async for user in db["users"].find({}, {"email": 1, "user_type": 1, "password_hash": 1, "full_name": 1, "_id": 0}):
        h = user.get("password_hash", "NONE")
        ut = user.get("user_type", "unknown")
        print(f"  {user.get('email','?')}  |  {ut}  |  hash: {h[:25]}...")
    client.close()

asyncio.run(check())
