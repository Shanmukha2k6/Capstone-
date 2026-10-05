import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.schemas import ChatMessage, ChatRequest
from app.services import llm_gateway, repo_context
from app.services.github_service import GitHubError


def request(text: str, repo_name: str = "Codebase", context: str = "") -> ChatRequest:
    return ChatRequest(repo_name=repo_name, context=context, messages=[ChatMessage(role="user", content=text)])


def test_links_in_latest_message_are_detected_and_deduplicated():
    req = request("https://github.com/Shanmukha2k6/VPN\nexplain this, also github.com/shanmukha2k6/vpn.git and https://github.com/a/b.")
    assert repo_context.linked_repos(req) == [("Shanmukha2k6", "VPN"), ("a", "b")]


def test_selected_project_without_files_is_used_only_when_no_link_or_context():
    assert repo_context.linked_repos(request("explain", "nanii08/VotingSystem")) == [("nanii08", "VotingSystem")]
    assert repo_context.linked_repos(request("explain", "nanii08/VotingSystem", "main.py: ...")) == []
    assert repo_context.linked_repos(request("explain", "Codebase")) == []


def test_key_files_prefer_readme_manifests_and_entry_points():
    tree = [{"path": p, "size": 10} for p in ["src/util/helpers.py", "logo.png", "client.py", "README.md", "requirements.txt", "docs/notes.txt"]]
    assert repo_context.pick_key_files(tree) == ["README.md", "requirements.txt", "client.py", "src/util/helpers.py"]


@pytest.fixture
def fake_github(monkeypatch):
    async def info(owner, repo, token=None):
        if repo == "missing":
            raise GitHubError(404, "Repository not found.")
        return {"full_name": f"{owner}/{repo}", "default_branch": "main", "language": "Python", "description": "A VPN"}
    async def tree(owner, repo, branch=None, token=None):
        return [{"path": "README.md", "size": 20}, {"path": "server.py", "size": 30}]
    async def content(owner, repo, path, token=None, ref=None):
        return f"contents of {path}"
    monkeypatch.setattr(repo_context.github_service, "get_repo_info", info)
    monkeypatch.setattr(repo_context.github_service, "get_repo_tree", tree)
    monkeypatch.setattr(repo_context.github_service, "get_file_content", content)


@pytest.mark.asyncio
async def test_snapshot_reads_key_files_and_reports_errors(fake_github):
    snap = await repo_context.repo_snapshot("Shanmukha2k6", "VPN")
    assert snap["repository"] == "Shanmukha2k6/VPN" and snap["file_count"] == 2
    assert [f["path"] for f in snap["key_files"]] == ["README.md", "server.py"]
    missing = await repo_context.repo_snapshot("x", "missing")
    assert missing == {"repository": "x/missing", "fetch_error": "Repository not found."}


@pytest.mark.asyncio
async def test_chat_prompt_includes_fetched_repository(fake_github, monkeypatch):
    prompts = []
    class Recorder(llm_gateway.MockProvider):
        async def stream(self, prompt, system=None):
            prompts.append(prompt)
            yield "ok"
    monkeypatch.setattr(llm_gateway.gateway, "provider", Recorder())
    payload = {"messages": [{"role": "user", "content": "https://github.com/Shanmukha2k6/VPN explain this"}]}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/chat/stream", json=payload)
    assert "Read Shanmukha2k6/VPN from GitHub" in response.text and "[DONE]" in response.text
    assert "contents of server.py" in prompts[0] and "github_repositories" in prompts[0]
    assert json.dumps("ok") in response.text
