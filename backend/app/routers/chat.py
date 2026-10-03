from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.services.chat_service import chat_config, chat_provider, stream_chat
from app.services.llm_gateway import GeminiProvider

router = APIRouter(prefix="/chat", tags=["Repository Chat"])


@router.get("/config")
async def get_chat_config(request: Request, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return chat_config(request)


@router.post("/stream")
async def chat_stream(req: ChatRequest, request: Request):
    provider = chat_provider(request)
    if request.headers.get("x-devmind-provider") == "gemini" and not isinstance(provider, GeminiProvider):
        raise HTTPException(409, "Your Gemini session key is no longer available. Save it again in Settings.")
    return StreamingResponse(stream_chat(req, provider), media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})
