"""Quick test for the price prediction API endpoint."""
import httpx
import json

BASE = "http://localhost:8000/api/v1"

# Step 1: Login (JSON body with username = email)
print("1. Logging in...")
login_resp = httpx.post(
    f"{BASE}/auth/login",
    json={"username": "admin@chiliscope.com", "password": "admin123"},
    timeout=30,
)
print(f"   Login status: {login_resp.status_code}")

if login_resp.status_code != 200:
    print(f"   Error: {login_resp.text[:300]}")
    # Try registering
    print("\n   Attempting registration...")
    reg = httpx.post(
        f"{BASE}/auth/register",
        json={
            "email": "test@chiliscope.com",
            "password": "test1234",
            "full_name": "Test User",
        },
        timeout=30,
    )
    print(f"   Register status: {reg.status_code}")
    if reg.status_code in (200, 201):
        login_resp = httpx.post(
            f"{BASE}/auth/login",
            json={"username": "test@chiliscope.com", "password": "test1234"},
            timeout=30,
        )
        print(f"   Login retry status: {login_resp.status_code}")

if login_resp.status_code != 200:
    print("Failed to authenticate. Testing without auth...")
    token = None
else:
    token = login_resp.json().get("access_token")
    print(f"   Token: {token[:20]}...")

headers = {"Authorization": f"Bearer {token}"} if token else {}

# Step 2: Test Siling Labuyo prediction
print("\n2. Predicting Siling Labuyo prices (7 days)...")
r = httpx.get(f"{BASE}/prices/predict/siling_labuyo?days=7", headers=headers, timeout=30)
print(f"   Status: {r.status_code}")

if r.status_code == 200:
    data = r.json()
    print(f"\n   Chili Type: {data['chili_type']}")
    print(f"\n   Predictions (next 7 days):")
    for p in data["predictions"]:
        print(f"     {p['date']}: ₱{p['predicted_price']:,.2f}")
    s = data["summary"]
    print(f"\n   Summary:")
    print(f"     Average: ₱{s['avg_predicted']:,.2f}")
    print(f"     Range: ₱{s['min_predicted']:,.2f} - ₱{s['max_predicted']:,.2f}")
    print(f"     Trend: {s['trend']} ({s['trend_pct']}%)")
    m = data["model_info"]
    print(f"\n   Model: {m['type']}")
    print(f"     R² Score: {m['r2_score']:.4f}")
    print(f"     MAE: ₱{m['mae']:,.2f}")
else:
    print(f"   Error: {r.text[:500]}")

# Step 3: Test Siling Haba prediction
print("\n3. Predicting Siling Haba prices (14 days)...")
r2 = httpx.get(f"{BASE}/prices/predict/siling_haba?days=14", headers=headers, timeout=30)
print(f"   Status: {r2.status_code}")

if r2.status_code == 200:
    data2 = r2.json()
    print(f"\n   Predictions (next 14 days):")
    for p in data2["predictions"]:
        print(f"     {p['date']}: ₱{p['predicted_price']:,.2f}")
    s2 = data2["summary"]
    print(f"\n   Trend: {s2['trend']} ({s2['trend_pct']}%)")
else:
    print(f"   Error: {r2.text[:500]}")

print("\n✅ Test complete!")
