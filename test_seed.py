"""Quick test: get a real Firebase token, sync with backend, then seed."""
import requests
import json

# Step 1: Get Firebase ID token
FIREBASE_API_KEY = "AIzaSyAvZhPw38elm8iaFxmieAymSzuCbyGCP1E"
login_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
login_resp = requests.post(login_url, json={
    "email": "admin@chiliscope.com",
    "password": "Admin@2026",
    "returnSecureToken": True,
})

if login_resp.status_code != 200:
    print(f"Login failed: {login_resp.status_code}")
    print(login_resp.json())
    exit(1)

id_token = login_resp.json()["idToken"]
print(f"1. Got Firebase token OK")

# Step 2: Sync with backend to get local JWT
sync_resp = requests.post(
    "http://localhost:8000/api/v1/auth/firebase-login",
    json={
        "id_token": id_token,
        "full_name": "ChiliScope Admin",
        "user_type": "admin",
    },
)
print(f"2. Backend sync: {sync_resp.status_code}")
if sync_resp.status_code != 200:
    print(f"   Error: {sync_resp.text[:500]}")
    exit(1)

data = sync_resp.json()
backend_token = data.get("access_token")
user_type = data.get("user", {}).get("user_type")
print(f"   User role: {user_type}")

# Step 3: Call the seed endpoint with the backend JWT
print(f"\n3. Calling /prices/seed ...")
seed_resp = requests.post(
    "http://localhost:8000/api/v1/prices/seed",
    headers={"Authorization": f"Bearer {backend_token}"},
    timeout=120,
)
print(f"   Status: {seed_resp.status_code}")
try:
    print(json.dumps(seed_resp.json(), indent=2))
except Exception:
    print(seed_resp.text[:1000])
