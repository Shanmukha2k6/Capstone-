from fastapi import APIRouter, Request, Response

from app.models.user_settings import GeminiKeyRequest, GeminiKeyStatus
from app.services import user_settings

router = APIRouter(prefix="/settings", tags=["User settings"])


@router.get("/gemini", response_model=GeminiKeyStatus)
async def get_gemini_settings(request: Request, response: Response) -> GeminiKeyStatus:
    response.headers["Cache-Control"] = "no-store"
    return user_settings.key_status(request)


@router.post("/gemini", response_model=GeminiKeyStatus)
async def save_gemini_settings(req: GeminiKeyRequest, request: Request, response: Response) -> GeminiKeyStatus:
    response.headers["Cache-Control"] = "no-store"
    return user_settings.save_key(request, response, req.api_key.get_secret_value())


@router.delete("/gemini", response_model=GeminiKeyStatus)
async def remove_gemini_settings(request: Request, response: Response) -> GeminiKeyStatus:
    response.headers["Cache-Control"] = "no-store"
    return user_settings.remove_key(request, response)
