import asyncio
import json
from typing import AsyncGenerator

from fastapi import Request

from app.core.config import settings
from app.models.schemas import ChatRequest
from app.services.llm_gateway import GeminiProvider, GeminiScanError, LLMProvider, MockProvider, gateway, gemini_scan_configured
from app.services.prompt_loader import render_prompt
from app.services.user_settings import scan_key


def chat_provider(request: Request) -> LLMProvider:
    key = scan_key(request)
    if key is not None or gemini_scan_configured():
        return GeminiProvider(key if key is not None else settings.GEMINI_API_KEY, settings.GEMINI_MODEL, initialize=False)
    return gateway.provider


def chat_config(request: Request) -> dict:
    provider = chat_provider(request)
    if isinstance(provider, GeminiProvider):
        return {"provider": "gemini", "configured": gemini_scan_configured(provider.api_key), "model": provider.model_name}
    return {"provider": "mock" if isinstance(provider, MockProvider) else "openai", "configured": True, "model": None}


async def stream_chat(req: ChatRequest, provider: LLMProvider) -> AsyncGenerator[str, None]:
    conversation = json.dumps(req.model_dump(), ensure_ascii=False)
    system, prompt = render_prompt("repository_chat", {"conversation": conversation})
    try:
        async with asyncio.timeout(180):
            async for token in provider.stream(prompt=prompt, system=system):
                yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"
    except GeminiScanError as exc:
        yield f"data: {json.dumps({'error': exc.detail})}\n\n"
    except TimeoutError:
        yield f"data: {json.dumps({'error': 'The assistant timed out. Try a shorter message or less context.'})}\n\n"
    except Exception:
        yield f"data: {json.dumps({'error': 'The assistant could not complete the response. Try again.'})}\n\n"
