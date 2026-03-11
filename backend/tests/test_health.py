"""
Tests for public / unauthenticated endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """GET / returns app info."""
    resp = await client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "app" in data
    assert data["status"] == "running"


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """GET /health returns healthy status."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_docs_accessible(client: AsyncClient):
    """API docs page loads."""
    resp = await client.get("/api/docs")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient):
    """OpenAPI JSON schema is served."""
    resp = await client.get("/api/openapi.json")
    assert resp.status_code == 200
    data = resp.json()
    assert "paths" in data
    assert "info" in data
