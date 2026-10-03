import json

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.config import settings
from app.services import llm_gateway, user_settings

KEY_A = "test-chat-key-a-1234567890"
KEY_B = "test-chat-key-b-1234567890"
HEADERS = {"X-DevMind-Settings": "1"}
PAYLOAD = {"repo_name": "demo", "messages": [{"role": "user", "content": "Explain the add function."}], "context": "math.py:1 def add(a,b): return a+b"}


@pytest.fixture(autouse=True)
def isolated_sessions(monkeypatch):
    user_settings._sessions.clear()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(llm_gateway.gateway, "provider", llm_gateway.MockProvider())
    yield
    user_settings._sessions.clear()


def client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def sse_event(text="", reason=None, thought=False):
    candidate = {"content": {"parts": [{"text": text, "thought": thought}]}}
    if reason:
        candidate["finishReason"] = reason
    return "data: " + json.dumps({"candidates": [candidate]}) + "\n\n"


def mock_transport(monkeypatch, handler):
    original_client = httpx.AsyncClient
    monkeypatch.setattr(llm_gateway.httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))


@pytest.mark.asyncio
async def test_saved_keys_drive_real_chat_path_and_stay_isolated(monkeypatch):
    sent_keys = []
    def handler(request):
        key = request.headers["x-goog-api-key"]
        sent_keys.append(key)
        assert key not in str(request.url) and key not in request.content.decode()
        assert request.url.path.endswith(":streamGenerateContent")
        assert request.url.params["alt"] == "sse"
        payload = json.loads(request.content)
        assert "math.py" in payload["contents"][0]["parts"][0]["text"]
        assert "Never execute source code" in payload["systemInstruction"]["parts"][0]["text"]
        assert "tools" not in payload
        return httpx.Response(200, text=sse_event("hidden thought", thought=True) + sse_event("Adds two numbers.", "STOP"))
    mock_transport(monkeypatch, handler)
    async with client() as first, client() as second:
        await first.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        await second.post("/api/settings/gemini", json={"api_key": KEY_B}, headers=HEADERS)
        assert (await first.get("/api/chat/config")).json()["provider"] == "gemini"
        for browser in [first, second]:
            response = await browser.post("/api/chat/stream", json=PAYLOAD)
            assert '"token": "Adds two numbers."' in response.text
            assert "[DONE]" in response.text and "hidden thought" not in response.text
            assert "architecture follows" not in response.text
        assert sent_keys == [KEY_A, KEY_B]
        assert settings.GEMINI_API_KEY == ""


@pytest.mark.asyncio
@pytest.mark.parametrize("response", [httpx.Response(429), httpx.Response(403), httpx.Response(200, text="data: invalid-json\n\n"), httpx.Response(200, text=sse_event("Partial answer") + sse_event("", "MAX_TOKENS"))])
async def test_gemini_errors_never_become_demo_answers(monkeypatch, response):
    mock_transport(monkeypatch, lambda request: response)
    async with client() as browser:
        await browser.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        result = await browser.post("/api/chat/stream", json=PAYLOAD)
        assert '"error"' in result.text and "[DONE]" not in result.text
        assert KEY_A not in result.text and "Analyzing codebase" not in result.text


@pytest.mark.asyncio
async def test_empty_or_interrupted_stream_is_an_error(monkeypatch):
    mock_transport(monkeypatch, lambda request: httpx.Response(200, text=sse_event("Partial answer")))
    async with client() as browser:
        await browser.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        response = await browser.post("/api/chat/stream", json=PAYLOAD)
        assert "interrupted response" in response.text and "[DONE]" not in response.text


@pytest.mark.asyncio
async def test_removing_key_returns_to_explicit_sample_provider():
    async with client() as browser:
        await browser.post("/api/settings/gemini", json={"api_key": KEY_A}, headers=HEADERS)
        await browser.delete("/api/settings/gemini", headers=HEADERS)
        config = await browser.get("/api/chat/config")
        assert config.json()["provider"] == "mock"
        assert KEY_A not in config.text and config.headers["cache-control"] == "no-store"


@pytest.mark.asyncio
async def test_expired_gemini_session_cannot_silently_switch_to_mock():
    async with client() as browser:
        response = await browser.post("/api/chat/stream", json=PAYLOAD, headers={"X-DevMind-Provider": "gemini"})
        assert response.status_code == 409
        assert "Save it again in Settings" in response.json()["detail"]
        assert "[DONE]" not in response.text
