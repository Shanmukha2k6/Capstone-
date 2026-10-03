import base64
from pathlib import PurePosixPath
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx

IGNORED_PATTERNS = {
    "node_modules", ".git", "venv", ".venv", "__pycache__", "dist", "build",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", ".DS_Store"
}
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
    ".ttf", ".eot", ".zip", ".tar", ".gz", ".exe", ".dll", ".so", ".dylib", ".pdf"
}


class GitHubError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class GitHubService:
    BASE_URL = "https://api.github.com"

    def _headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "DevMind-AI"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def _request(self, path: str, token: Optional[str] = None,
                       params: Optional[Dict[str, Any]] = None) -> Any:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(f"{self.BASE_URL}{path}", headers=self._headers(token), params=params)
        except httpx.RequestError as exc:
            raise GitHubError(502, "Could not reach GitHub. Try again shortly.") from exc
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 401:
            raise GitHubError(401, "GitHub token is invalid or expired. Update it or remove it for public repositories.")
        if resp.status_code in (403, 429):
            limited = resp.status_code == 429 or resp.headers.get("x-ratelimit-remaining") == "0" or "rate limit" in resp.text.lower()
            message = "GitHub rate limit reached. Wait and retry, or add a GitHub token." if limited else "GitHub denied access. Check your token's repository permissions."
            raise GitHubError(429 if limited else 403, message)
        if resp.status_code == 404:
            raise GitHubError(404, "Repository, branch, or file not found. Check the URL; private repositories need an authorized GitHub token.")
        if resp.status_code == 409:
            raise GitHubError(409, "This repository is empty and has no files to analyze.")
        raise GitHubError(502, f"GitHub could not complete the request (HTTP {resp.status_code}). Try again.")

    def _repo_path(self, owner: str, repo: str) -> str:
        return f"/repos/{quote(owner, safe='')}/{quote(repo, safe='')}"

    def _summary(self, repo: Dict[str, Any]) -> Dict[str, Any]:
        return {"full_name": repo["full_name"], "description": repo.get("description"),
                "default_branch": repo["default_branch"], "language": repo.get("language"),
                "stars": repo.get("stargazers_count", 0)}

    async def list_user_repos(self, token: str) -> List[Dict[str, Any]]:
        repos = await self._request("/user/repos", token, {"sort": "updated", "per_page": 30})
        return [dict(self._summary(repo), id=repo["id"], name=repo["name"],
                     forks=repo.get("forks_count", 0), is_private=repo.get("private", False),
                     updated_at=repo.get("updated_at", "")) for repo in repos]

    async def search_topic(self, topic: str, token: Optional[str] = None) -> Dict[str, Any]:
        data = await self._request("/search/repositories", token,
                                   {"q": f"topic:{topic}", "sort": "stars", "order": "desc", "per_page": 20})
        return {"topic": topic, "total_count": data["total_count"],
                "incomplete_results": data.get("incomplete_results", False),
                "repositories": [self._summary(repo) for repo in data.get("items", [])]}

    async def get_repo_info(self, owner: str, repo: str, token: Optional[str] = None) -> Dict[str, Any]:
        return await self._request(self._repo_path(owner, repo), token)

    async def get_repo_tree(self, owner: str, repo: str, branch: Optional[str] = None,
                            token: Optional[str] = None) -> List[Dict[str, Any]]:
        if not branch:
            info = await self.get_repo_info(owner, repo, token)
            branch = info.get("default_branch")
            if not branch:
                raise GitHubError(409, "This repository has no default branch to analyze.")
        path = f"{self._repo_path(owner, repo)}/git/trees/{quote(branch, safe='')}"
        data = await self._request(path, token, {"recursive": 1})
        if data.get("truncated"):
            raise GitHubError(422, "This repository's file tree is too large to load completely. Try a smaller repository.")
        return [{"path": item["path"], "type": "blob", "size": item.get("size", 0)}
                for item in data.get("tree", []) if self._is_text_file(item)]

    def _is_text_file(self, item: Dict[str, Any]) -> bool:
        path = PurePosixPath(item.get("path", ""))
        return (item.get("type") == "blob" and not any(part in IGNORED_PATTERNS for part in path.parts)
                and path.suffix.lower() not in BINARY_EXTENSIONS)

    async def get_file_content(self, owner: str, repo: str, path: str,
                               token: Optional[str] = None, ref: Optional[str] = None) -> str:
        url = f"{self._repo_path(owner, repo)}/contents/{quote(path, safe='/')}"
        data = await self._request(url, token, {"ref": ref} if ref else None)
        if not isinstance(data, dict) or data.get("type") != "file":
            raise GitHubError(422, "Select a source file, rather than a directory or submodule.")
        if data.get("size", 0) > 1_000_000 or data.get("encoding") != "base64":
            raise GitHubError(422, "This file is too large to preview. Choose a smaller source file.")
        try:
            content = base64.b64decode(data.get("content", "")).decode("utf-8")
        except (ValueError, UnicodeDecodeError) as exc:
            raise GitHubError(422, "This file is not UTF-8 source text. Choose another file.") from exc
        if "\x00" in content:
            raise GitHubError(422, "Binary files cannot be analyzed. Choose a source file.")
        return content

    async def get_scan_snapshot(self, owner: str, repo: str, token: Optional[str] = None) -> Dict[str, Any]:
        info = await self.get_repo_info(owner, repo, token)
        branch = info.get("default_branch")
        if not branch:
            raise GitHubError(409, "This repository has no default branch to scan.")
        commit = await self._request(f"{self._repo_path(owner, repo)}/commits/{quote(branch, safe='')}", token)
        revision = commit["sha"]
        tree = await self.get_repo_tree(owner, repo, revision, token)
        return {"branch": branch, "revision": revision, "files": tree}

    async def get_repo_stats(self, owner: str, repo: str, token: Optional[str] = None) -> Dict[str, Any]:
        info = await self.get_repo_info(owner, repo, token)
        languages = await self._request(f"{self._repo_path(owner, repo)}/languages", token)
        total_bytes = sum(languages.values()) or 1
        return dict(self._summary(info), stars=info.get("stargazers_count", 0),
                    forks=info.get("forks_count", 0), open_issues=info.get("open_issues_count", 0),
                    subscribers=info.get("subscribers_count", 0),
                    languages=[{"name": name, "bytes": size, "percentage": round(size / total_bytes * 100, 1)}
                               for name, size in languages.items()])


github_service = GitHubService()
