"""Temporary credentials isolated by an opaque, HttpOnly browser-session cookie."""
import asyncio
import secrets
import time
from collections import OrderedDict

from fastapi import HTTPException, Request, Response

from app.core.config import settings
from app.models.user_settings import GeminiKeyStatus
from app.services.llm_gateway import gemini_scan_configured

COOKIE_NAME = "devmind_gemini_session"
SESSION_SECONDS = 8 * 60 * 60
MAX_SESSIONS = 1024
_sessions: OrderedDict[str, tuple[str, float]] = OrderedDict()


def session_credential(request: Request) -> tuple[str, int] | None:
    session_id = request.cookies.get(COOKIE_NAME, "")
    entry = _sessions.get(session_id)
    if entry and entry[1] > time.monotonic():
        return entry[0], max(1, int(entry[1] - time.monotonic()))
    _sessions.pop(session_id, None)
    return None


def scan_key(request: Request) -> str | None:
    entry = session_credential(request)
    return entry[0] if entry else None


def key_status(request: Request) -> GeminiKeyStatus:
    entry = session_credential(request)
    server_key = gemini_scan_configured()
    return GeminiKeyStatus(configured=bool(entry) or server_key, session_key=bool(entry),
        source="session" if entry else "server" if server_key else "none",
        model=settings.GEMINI_MODEL, expires_in_seconds=entry[1] if entry else None)


def require_settings_request(request: Request) -> None:
    origin = request.headers.get("origin")
    if request.headers.get("x-devmind-settings") != "1" or (origin and origin not in settings.ALLOWED_ORIGINS):
        raise HTTPException(403, "Use the DevMind settings page to change your session key.")


def save_key(request: Request, response: Response, api_key: str) -> GeminiKeyStatus:
    require_settings_request(request)
    _sessions.pop(request.cookies.get(COOKIE_NAME, ""), None)
    now = time.monotonic()
    for session_id in list(_sessions):
        if _sessions[session_id][1] <= now:
            del _sessions[session_id]
    while len(_sessions) >= MAX_SESSIONS:
        _sessions.popitem(last=False)
    session_id = secrets.token_urlsafe(32)
    _sessions[session_id] = (api_key, now + SESSION_SECONDS)
    asyncio.get_running_loop().call_later(SESSION_SECONDS, _sessions.pop, session_id, None)
    response.set_cookie(COOKIE_NAME, session_id, max_age=SESSION_SECONDS, httponly=True,
                        secure=request.url.scheme == "https", samesite="strict", path="/api")
    return GeminiKeyStatus(configured=True, session_key=True, source="session",
                          model=settings.GEMINI_MODEL, expires_in_seconds=SESSION_SECONDS)


def remove_key(request: Request, response: Response) -> GeminiKeyStatus:
    require_settings_request(request)
    _sessions.pop(request.cookies.get(COOKIE_NAME, ""), None)
    response.delete_cookie(COOKIE_NAME, path="/api", httponly=True, samesite="strict")
    return key_status(request)
