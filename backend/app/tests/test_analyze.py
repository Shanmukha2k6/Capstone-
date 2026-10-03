import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_explain_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "code": "def add(a, b):\n    return a + b",
            "language": "python",
            "level": "intermediate"
        }
        res = await ac.post("/api/analyze/explain", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "purpose" in data
    assert "walkthrough" in data
    assert "time_complexity" in data

@pytest.mark.asyncio
async def test_bugs_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "code": "import sqlite3\ndef get_user(uid):\n    return db.execute(f'SELECT * FROM users WHERE id = {uid}')",
            "language": "python"
        }
        res = await ac.post("/api/analyze/bugs", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "findings" in data
    assert "summary" in data

@pytest.mark.asyncio
async def test_refactor_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "code": "def process(items):\n    res = []\n    for i in items:\n        if i > 0:\n            res.append(i * 2)\n    return res",
            "language": "python",
            "focus": "readability"
        }
        res = await ac.post("/api/analyze/refactor", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "suggestions" in data
    assert "summary" in data

@pytest.mark.asyncio
async def test_quality_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "code": "def foo():\n    pass",
            "language": "python"
        }
        res = await ac.post("/api/analyze/quality", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "overall_score" in data
    assert "dimensions" in data
    assert "maintainability" in data["dimensions"]
