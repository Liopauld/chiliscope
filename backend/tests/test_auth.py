"""
Tests for authentication endpoints.

These tests verify:
  - Registration validation
  - Login with invalid credentials
  - Protected endpoint access without token
  - Token structure
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


# ── Registration Validation ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_missing_fields(client: AsyncClient):
    """Registration without required fields returns 422."""
    resp = await client.post("/api/v1/auth/register", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    """Registration with malformed email is rejected."""
    resp = await client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "StrongPass123",
        "full_name": "Test User",
    })
    assert resp.status_code == 422


# ── Login Validation ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_wrong_credentials(client: AsyncClient):
    """Login with non-existent user returns 401."""
    resp = await client.post("/api/v1/auth/login", json={
        "username": "nonexistent@example.com",
        "password": "WrongPassword123",
    })
    assert resp.status_code == 401


# ── Protected Endpoints ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_without_token(client: AsyncClient):
    """GET /auth/me without token returns 401."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_with_valid_token(client: AsyncClient, user_token: str):
    """GET /auth/me with valid JWT returns user info."""
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    # Should succeed or 404 if user not in DB — but NOT 401
    assert resp.status_code in (200, 404)


# ── Token Format ──────────────────────────────────────────────────────────

def test_access_token_structure():
    """Access token is a valid JWT string."""
    token = create_access_token({"sub": "u1", "email": "a@b.c", "user_type": "user"})
    parts = token.split(".")
    assert len(parts) == 3, "JWT must have 3 dot-separated parts"
