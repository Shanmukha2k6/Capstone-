import asyncio
import re
from pathlib import PurePosixPath
from typing import Any, Dict, List, Optional, Tuple

from app.models.schemas import ChatRequest
from app.services.github_service import GitHubError, github_service

GITHUB_URL = re.compile(r"(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9-]{1,39})/([A-Za-z0-9._-]{1,100})", re.I)
FULL_NAME = re.compile(r"^([A-Za-z0-9-]{1,39})/([A-Za-z0-9._-]{1,100})$")
MANIFESTS = {"package.json", "requirements.txt", "pyproject.toml", "go.mod", "cargo.toml", "pom.xml",
             "build.gradle", "build.gradle.kts", "dockerfile", "docker-compose.yml", "makefile", "cmakelists.txt"}
ENTRY_STEMS = {"main", "app", "index", "server", "client", "cli", "__main__", "manage", "program"}
SOURCE_EXTS = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rs", ".c", ".cpp", ".h", ".cs",
               ".rb", ".php", ".kt", ".swift", ".sh", ".html", ".css", ".sql"}
MAX_REPOS, MAX_FILES, MAX_TREE = 2, 8, 300
MAX_FILE_CHARS, MAX_TOTAL_CHARS = 6_000, 40_000


def _clean_repo(name: str) -> str:
    return re.sub(r"\.git$", "", name.rstrip("."))


def linked_repos(req: ChatRequest) -> List[Tuple[str, str]]:
    """GitHub repositories referenced in the latest user message, or the selected project without files."""
    latest = next((m.content for m in reversed(req.messages) if m.role == "user"), "")
    found = [(owner, _clean_repo(repo)) for owner, repo in GITHUB_URL.findall(latest)]
    selected = FULL_NAME.match(req.repo_name or "")
    if not found and selected and not (req.context or "").strip():
        found = [(selected.group(1), _clean_repo(selected.group(2)))]
    unique: Dict[str, Tuple[str, str]] = {}
    for owner, repo in found:
        unique.setdefault(f"{owner}/{repo}".lower(), (owner, repo))
    return list(unique.values())[:MAX_REPOS]


def _file_rank(path: str) -> Tuple[int, int, str]:
    pure = PurePosixPath(path)
    name, depth = pure.name.lower(), len(pure.parts)
    if name.startswith("readme"):
        tier = 0
    elif name in MANIFESTS:
        tier = 1
    elif pure.stem.lower() in ENTRY_STEMS and pure.suffix.lower() in SOURCE_EXTS:
        tier = 2
    elif pure.suffix.lower() in SOURCE_EXTS:
        tier = 3
    else:
        tier = 9
    return tier, depth, path


def pick_key_files(tree: List[Dict[str, Any]]) -> List[str]:
    candidates = [item["path"] for item in tree if 0 < item.get("size", 0) <= 200_000]
    ranked = sorted(candidates, key=_file_rank)
    return [path for path in ranked if _file_rank(path)[0] < 9][:MAX_FILES]


async def _read_files(owner: str, repo: str, paths: List[str], ref: str) -> List[Dict[str, str]]:
    async def read(path: str) -> Optional[Dict[str, str]]:
        try:
            text = await github_service.get_file_content(owner, repo, path, ref=ref)
        except GitHubError:
            return None
        clipped = text if len(text) <= MAX_FILE_CHARS else text[:MAX_FILE_CHARS] + "\n... [truncated]"
        return {"path": path, "content": clipped}
    results = await asyncio.gather(*(read(path) for path in paths))
    files, total = [], 0
    for item in results:
        if item and total + len(item["content"]) <= MAX_TOTAL_CHARS:
            files.append(item)
            total += len(item["content"])
    return files


async def repo_snapshot(owner: str, repo: str) -> Dict[str, Any]:
    """Fetch a read-only snapshot (metadata, file list, key files) of a public GitHub repository."""
    try:
        info = await github_service.get_repo_info(owner, repo)
        branch = info.get("default_branch") or "main"
        tree = await github_service.get_repo_tree(owner, repo, branch)
    except GitHubError as exc:
        return {"repository": f"{owner}/{repo}", "fetch_error": exc.detail}
    files = await _read_files(owner, repo, pick_key_files(tree), branch)
    return {"repository": info.get("full_name", f"{owner}/{repo}"), "description": info.get("description"),
            "default_branch": branch, "primary_language": info.get("language"),
            "stars": info.get("stargazers_count", 0), "file_count": len(tree),
            "file_list": [item["path"] for item in tree[:MAX_TREE]], "key_files": files}


async def gather_repo_context(req: ChatRequest) -> List[Dict[str, Any]]:
    repos = linked_repos(req)
    if not repos:
        return []
    return list(await asyncio.gather(*(repo_snapshot(owner, repo) for owner, repo in repos)))
