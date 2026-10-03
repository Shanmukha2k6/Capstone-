import base64

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import github_service as module


def mock_github(monkeypatch, handler):
    original_client = httpx.AsyncClient
    monkeypatch.setattr(module.httpx, "AsyncClient",
                        lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))


async def get_api(path, **kwargs):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.get(path, **kwargs)


@pytest.mark.asyncio
async def test_topic_discovery_and_header_token(monkeypatch):
    def handler(request):
        assert request.url.path == "/search/repositories"
        assert request.url.params["q"] == "topic:open-source-project"
        assert request.headers["authorization"] == "Bearer test-token"
        assert "token" not in request.url.params
        return httpx.Response(200, json={"total_count": 1, "items": [{"full_name": "demo/project", "default_branch": "develop", "stargazers_count": 42}]})
    mock_github(monkeypatch, handler)
    result = await get_api("/api/repos/topics/open-source-project", headers={"Authorization": "Bearer test-token"})
    assert result.status_code == 200
    assert result.json()["repositories"][0]["full_name"] == "demo/project"
    assert result.json()["repositories"][0]["stars"] == 42


@pytest.mark.asyncio
async def test_default_branch_and_only_actual_text_files(monkeypatch):
    visited = []
    def handler(request):
        visited.append(request.url)
        if request.url.path == "/repos/demo/project":
            return httpx.Response(200, json={"default_branch": "release/next"})
        assert b"release%2Fnext" in request.url.raw_path
        return httpx.Response(200, json={"tree": [
            {"path": "src", "type": "tree"}, {"path": "src/main.py", "type": "blob", "size": 20},
            {"path": "node_modules/dependency.js", "type": "blob"}, {"path": "logo.PNG", "type": "blob"},
            {"path": "vendor", "type": "commit"}, {"path": "package-lock.json", "type": "blob"}]})
    mock_github(monkeypatch, handler)
    result = await get_api("/api/repos/demo/project/tree")
    assert result.status_code == 200
    assert result.json() == [{"path": "src/main.py", "type": "blob", "size": 20}]
    assert len(visited) == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("status,headers,expected,message", [
    (404, {}, 404, "not found"), (401, {}, 401, "invalid or expired"),
    (403, {"x-ratelimit-remaining": "0"}, 429, "rate limit"),
    (403, {}, 403, "denied access"), (409, {}, 409, "empty"), (503, {}, 502, "could not complete")])
async def test_github_errors_never_become_empty_trees(monkeypatch, status, headers, expected, message):
    mock_github(monkeypatch, lambda request: httpx.Response(status, headers=headers, json={"message": "failure"}))
    result = await get_api("/api/repos/demo/project/tree?branch=main")
    assert result.status_code == expected
    assert message in result.json()["detail"]


@pytest.mark.asyncio
async def test_file_content_decoded_without_replacement(monkeypatch):
    code = "def hello():\n    return 'hello'\n"
    mock_github(monkeypatch, lambda request: httpx.Response(200, json={"type": "file", "encoding": "base64", "size": len(code), "content": base64.b64encode(code.encode()).decode()}))
    result = await get_api("/api/repos/demo/project/file?path=src/main.py")
    assert result.status_code == 200
    assert result.json()["content"] == code


@pytest.mark.asyncio
@pytest.mark.parametrize("data", [
    [{"type": "file"}], {"type": "submodule"},
    {"type": "file", "encoding": "none", "size": 2_000_000},
    {"type": "file", "encoding": "base64", "content": base64.b64encode(b"\xff\x00").decode()}])
async def test_invalid_files_cannot_be_forwarded_as_source(monkeypatch, data):
    mock_github(monkeypatch, lambda request: httpx.Response(200, json=data))
    result = await get_api("/api/repos/demo/project/file?path=src")
    assert result.status_code == 422


@pytest.mark.asyncio
async def test_truncated_tree_is_reported(monkeypatch):
    mock_github(monkeypatch, lambda request: httpx.Response(200, json={"truncated": True, "tree": []}))
    result = await get_api("/api/repos/demo/project/tree?branch=main")
    assert result.status_code == 422
    assert "too large" in result.json()["detail"]


@pytest.mark.asyncio
async def test_network_failure_is_actionable(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("unreachable", request=request)
    mock_github(monkeypatch, handler)
    result = await get_api("/api/repos/demo/project/tree")
    assert result.status_code == 502
    assert "Could not reach GitHub" in result.json()["detail"]
