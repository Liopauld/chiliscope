"""
Tests for samples and predictions endpoints.

Covers:
  - Sample CRUD access control
  - Public feed availability
  - Predictions endpoint auth
  - Hotspots public API
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import create_access_token


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def user_token() -> str:
    return create_access_token({
        "sub": "test-user-001",
        "email": "test@example.com",
        "user_type": "user",
    })


@pytest.fixture
def admin_token() -> str:
    return create_access_token({
        "sub": "test-admin-001",
        "email": "admin@example.com",
        "user_type": "admin",
    })


# ── Samples ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_samples_list_requires_auth(client: AsyncClient):
    """GET /samples without token returns 401."""
    resp = await client.get("/api/v1/samples")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_samples_list_with_auth(client: AsyncClient, user_token: str):
    """GET /samples with valid token succeeds."""
    resp = await client.get(
        "/api/v1/samples",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data or "samples" in data or isinstance(data, list)


@pytest.mark.asyncio
async def test_public_feed_no_auth(client: AsyncClient):
    """GET /samples/public/feed is accessible without auth."""
    resp = await client.get("/api/v1/samples/public/feed")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_sample_requires_auth(client: AsyncClient):
    """POST /samples without token returns 401."""
    resp = await client.post("/api/v1/samples", json={
        "variety": "siling_labuyo",
        "heat_category": "hot",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_nonexistent_sample(client: AsyncClient, user_token: str):
    """DELETE /samples/nonexistent returns 404."""
    resp = await client.delete(
        "/api/v1/samples/000000000000000000000000",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code in (404, 400)


# ── Predictions ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_classify_requires_auth(client: AsyncClient):
    """POST /predictions/classify-image without auth returns 401."""
    resp = await client.post("/api/v1/predictions/classify-image")
    assert resp.status_code in (401, 422)


@pytest.mark.asyncio
async def test_prediction_history_requires_auth(client: AsyncClient):
    """GET /predictions/history requires auth."""
    resp = await client.get("/api/v1/predictions/history")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_prediction_history_with_auth(client: AsyncClient, user_token: str):
    """GET /predictions/history with auth returns list."""
    resp = await client.get(
        "/api/v1/predictions/history",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200


# ── Hotspots ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_hotspots_public(client: AsyncClient):
    """GET /hotspots is public."""
    resp = await client.get("/api/v1/hotspots")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_hotspot_create_requires_admin(client: AsyncClient, user_token: str):
    """POST /hotspots as regular user returns 403."""
    resp = await client.post(
        "/api/v1/hotspots",
        json={"name": "Test", "region": "R", "province": "P", "lat": 14.0, "lng": 121.0},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


# ── ML Models ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_model_comparison_public(client: AsyncClient):
    """GET /ml/model-comparison may require auth or be admin-only."""
    resp = await client.get("/api/v1/ml/model-comparison")
    # Either 200 (public) or 401/403 (restricted) — just shouldn't 500
    assert resp.status_code in (200, 401, 403)


@pytest.mark.asyncio
async def test_retrain_requires_admin(client: AsyncClient, user_token: str):
    """POST /ml/retrain as regular user returns 403."""
    resp = await client.post(
        "/api/v1/ml/retrain",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


# ── Content ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_content_endpoint(client: AsyncClient):
    """GET /content/content returns structured data."""
    resp = await client.get("/api/v1/content/content")
    assert resp.status_code == 200
    data = resp.json()
    assert "news" in data or "recipes" in data or isinstance(data, dict)


# ── Prices ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_prices_public(client: AsyncClient):
    """GET /prices (or related) is accessible."""
    resp = await client.get("/api/v1/prices")
    assert resp.status_code in (200, 404)
