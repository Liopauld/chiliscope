"""
Shared test fixtures for ChiliScope backend tests.
"""

import pytest
import asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import create_access_token


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def user_token() -> str:
    """JWT access token for a regular user."""
    return create_access_token({
        "sub": "test-user-001",
        "email": "test@example.com",
        "user_type": "user",
    })


@pytest.fixture
def admin_token() -> str:
    """JWT access token for an admin user."""
    return create_access_token({
        "sub": "test-admin-001",
        "email": "admin@example.com",
        "user_type": "admin",
    })


@pytest.fixture
async def client():
    """Async HTTP client backed by the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
