import re
from typing import Any, Coroutine, Optional

from fastapi import APIRouter, Header, HTTPException, Query, Request, Response

from app.models.schemas import TopicRepositoriesResponse, MalwareScanRequest, MalwareScanResponse
from app.services.github_service import GitHubError, github_service
from app.services.llm_gateway import GeminiScanError
from app.services.malware_scan import scan_repository
from app.services.user_settings import key_status, scan_key

router = APIRouter(prefix="/repos", tags=["GitHub Repositories"])


def auth_token(authorization: Optional[str], token: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:]
    return token


async def github_result(operation: Coroutine[Any, Any, Any]) -> Any:
    try:
        return await operation
    except (GitHubError, GeminiScanError) as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/scan-config")
async def scan_config(request: Request, response: Response) -> Any:
    response.headers["Cache-Control"] = "no-store"
    return {"provider": "gemini", **key_status(request).model_dump()}


@router.get("")
async def list_repositories(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)) -> Any:
    credential = auth_token(authorization, token)
    if not credential:
        raise HTTPException(status_code=401, detail="GitHub personal access token or OAuth token required")
    return await github_result(github_service.list_user_repos(credential))


@router.get("/topics/{topic}", response_model=TopicRepositoriesResponse)
async def topic_repositories(topic: str, authorization: Optional[str] = Header(None),
                             token: Optional[str] = Query(None)) -> Any:
    if not re.fullmatch(r"[a-zA-Z0-9-]{1,50}", topic):
        raise HTTPException(status_code=422, detail="Use a GitHub topic name containing letters, numbers, and hyphens.")
    return await github_result(github_service.search_topic(topic.lower(), auth_token(authorization, token)))


@router.get("/{owner}/{repo}/tree")
async def get_tree(owner: str, repo: str, branch: Optional[str] = None,
                   authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)) -> Any:
    return await github_result(github_service.get_repo_tree(owner, repo, branch, auth_token(authorization, token)))


@router.get("/{owner}/{repo}/file")
async def get_file(owner: str, repo: str, path: str = Query(...),
                   authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)) -> Any:
    content = await github_result(github_service.get_file_content(owner, repo, path, auth_token(authorization, token)))
    return {"path": path, "content": content}


@router.get("/{owner}/{repo}/stats")
async def get_stats(owner: str, repo: str, authorization: Optional[str] = Header(None),
                    token: Optional[str] = Query(None)) -> Any:
    return await github_result(github_service.get_repo_stats(owner, repo, auth_token(authorization, token)))


@router.post("/{owner}/{repo}/malware-scan", response_model=MalwareScanResponse)
async def malware_scan(owner: str, repo: str, req: MalwareScanRequest, request: Request,
                        authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)) -> Any:
    return await github_result(scan_repository(owner, repo, req.max_files, auth_token(authorization, token), scan_key(request)))
