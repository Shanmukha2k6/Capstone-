from unittest.mock import AsyncMock

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.config import settings
from app.services import user_settings, llm_gateway

KEY_A = "test-session-key-a-1234567890"
KEY_B = "test-session-key-b-1234567890"
HEADERS = {"X-DevMind-Settings": "1", "Origin": "http://localhost:5174"}


@pytest.fixture(autouse=True)
def temporary_credentials(monkeypatch):
    user_settings._sessions.clear()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    yield
    user_settings._sessions.clear()


def client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_session_key_is_private_and_isolated_between_browsers():
    async with client() as first, client() as second:
        saved = await first.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        assert saved.status_code == 200 and saved.json()["source"] == "session"
        assert KEY_A not in saved.text and "api_key" not in saved.json()
        assert "HttpOnly" in saved.headers["set-cookie"] and "SameSite=strict" in saved.headers["set-cookie"]
        assert saved.headers["cache-control"] == "no-store"
        assert (await first.get("/api/repos/scan-config")).json()["configured"]
        assert not (await second.get("/api/repos/scan-config")).json()["configured"]


@pytest.mark.asyncio
async def test_replace_remove_and_expiry_revoke_old_session():
    async with client() as browser:
        await browser.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        previous = browser.cookies.get(user_settings.COOKIE_NAME)
        await browser.post("/api/settings/gemini", json={"api_key": KEY_B}, headers=HEADERS)
        assert previous not in user_settings._sessions
        active = browser.cookies.get(user_settings.COOKIE_NAME)
        assert user_settings._sessions[active][0] == KEY_B
        user_settings._sessions[active] = (KEY_B, 0)
        assert not (await browser.get("/api/settings/gemini")).json()["configured"]
        await browser.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        removed = await browser.delete("/api/settings/gemini", headers=HEADERS)
        assert not removed.json()["session_key"] and not removed.json()["configured"]
        assert not user_settings._sessions


@pytest.mark.asyncio
async def test_removing_session_key_preserves_server_configuration(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", KEY_A)
    async with client() as browser:
        await browser.post("/api/settings/gemini", json={"api_key": KEY_B}, headers=HEADERS)
        removed = await browser.delete("/api/settings/gemini", headers=HEADERS)
        assert removed.json()["source"] == "server"
        assert settings.GEMINI_API_KEY == KEY_A


@pytest.mark.asyncio
@pytest.mark.parametrize("headers", [{}, {"X-DevMind-Settings": "1", "Origin": "https://untrusted.example"}])
async def test_cross_origin_or_unmarked_changes_are_rejected(headers):
    async with client() as browser:
        response = await browser.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=headers)
        assert response.status_code == 403 and not user_settings._sessions


@pytest.mark.asyncio
async def test_invalid_key_is_not_echoed_in_validation_error():
    invalid = "private-secret\nwith-newline"
    async with client() as browser:
        response = await browser.post("/api/settings/gemini", json={"api_key": invalid}, headers=HEADERS)
        assert response.status_code == 422
        assert "private-secret" not in response.text and not user_settings._sessions


@pytest.mark.asyncio
async def test_scan_uses_browser_key_without_changing_global_settings(monkeypatch):
    scanner = AsyncMock(side_effect=llm_gateway.GeminiScanError(502, "Test provider error"))
    monkeypatch.setattr("app.routers.repos.scan_repository", scanner)
    async with client() as browser:
        await browser.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        response = await browser.post("/api/repos/demo/project/malware-scan", json={"max_files": 6})
        assert response.status_code == 502
        scanner.assert_awaited_once_with("demo", "project", 6, None, KEY_A)
        assert settings.GEMINI_API_KEY == ""


@pytest.mark.asyncio
async def test_session_key_reaches_gemini_in_header_only(monkeypatch):
    from app.models.schemas import MalwareModelResult
    original_client = httpx.AsyncClient
    def handler(request):
        assert request.headers["x-goog-api-key"] == KEY_B
        assert KEY_B not in str(request.url) and KEY_B not in request.content.decode()
        return httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": '{"summary":"No indicators in supplied source.","findings":[]}'}]}}]})
    monkeypatch.setattr(llm_gateway.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))
    result = await llm_gateway.generate_gemini_security("source", "system", MalwareModelResult, api_key=KEY_B)
    assert not result.findings and settings.GEMINI_API_KEY == ""
