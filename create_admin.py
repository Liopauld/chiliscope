"""
Create a verified admin account in Firebase + MongoDB.
Run from project root: python create_admin.py
"""
import asyncio
import os
import sys
from datetime import datetime
from uuid import uuid4

# ── Firebase Admin SDK ──────────────────────────────────────────────
import firebase_admin
from firebase_admin import credentials, auth

CRED_PATH = os.path.join(os.path.dirname(__file__), "backend", "firebase-credentials.json")
if not firebase_admin._apps:
    cred = credentials.Certificate(CRED_PATH)
    firebase_admin.initialize_app(cred)

# ── MongoDB (motor) ─────────────────────────────────────────────────
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb+srv://chiliscope:chiliscope@cluster0.mkvl1in.mongodb.net/chiliscope"
DB_NAME = "chiliscope"

# ── Admin credentials ──────────────────────────────────────────────
ADMIN_EMAIL = "admin@chiliscope.com"
ADMIN_PASSWORD = "Admin@2026"
ADMIN_NAME = "ChiliScope Admin"


async def main():
    print("=" * 50)
    print("🌶️  ChiliScope — Create Verified Admin Account")
    print("=" * 50)

    # ── Step 1: Firebase ────────────────────────────────────────────
    print("\n📌 Step 1: Firebase Authentication")
    firebase_uid = None

    try:
        existing = auth.get_user_by_email(ADMIN_EMAIL)
        print(f"   User already exists: {existing.uid}")
        print(f"   Verified: {existing.email_verified}")
        if not existing.email_verified:
            auth.update_user(existing.uid, email_verified=True)
            print("   ✅ Updated to verified!")
        else:
            print("   ✅ Already verified")
        firebase_uid = existing.uid
    except auth.UserNotFoundError:
        user = auth.create_user(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            display_name=ADMIN_NAME,
            email_verified=True,
        )
        print(f"   ✅ Created Firebase user: {user.uid}")
        firebase_uid = user.uid

    print(f"   Firebase UID: {firebase_uid}")

    # ── Step 2: MongoDB ─────────────────────────────────────────────
    print("\n📌 Step 2: MongoDB User Document")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    existing_doc = await db.users.find_one({"email": ADMIN_EMAIL})

    if existing_doc:
        print(f"   User doc exists: {existing_doc.get('user_id')}")
        print(f"   Current role: {existing_doc.get('user_type')}")
        print(f"   Firebase UID: {existing_doc.get('firebase_uid', 'NOT SET')}")

        # Update to admin + link Firebase UID
        update = {
            "user_type": "admin",
            "firebase_uid": firebase_uid,
            "is_active": True,
            "updated_at": datetime.utcnow(),
        }
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": update})
        print("   ✅ Updated: role=admin, firebase_uid linked")
    else:
        doc = {
            "user_id": str(uuid4()),
            "firebase_uid": firebase_uid,
            "email": ADMIN_EMAIL,
            "password_hash": "",
            "full_name": ADMIN_NAME,
            "user_type": "admin",
            "location": None,
            "is_active": True,
            "profile_image": None,
            "created_at": datetime.utcnow(),
            "updated_at": None,
        }
        await db.users.insert_one(doc)
        print(f"   ✅ Created MongoDB user: {doc['user_id']}")

    client.close()

    # ── Summary ─────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("🎉 Admin account ready!")
    print("=" * 50)
    print(f"\n   Email:    {ADMIN_EMAIL}")
    print(f"   Password: {ADMIN_PASSWORD}")
    print(f"   Role:     admin")
    print(f"   Verified: ✅ Yes")
    print(f"\n   You can now log in on the frontend.")


if __name__ == "__main__":
    asyncio.run(main())
