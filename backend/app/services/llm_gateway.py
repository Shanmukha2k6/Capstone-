import os
import json
import logging
import asyncio
import httpx
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, Type, TypeVar
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger("llm_gateway")
T = TypeVar("T", bound=BaseModel)

class GeminiScanError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code, self.detail = status_code, detail
        super().__init__(detail)

def gemini_scan_configured(api_key: Optional[str] = None) -> bool:
    value = (settings.GEMINI_API_KEY if api_key is None else api_key).strip()
    return bool(value and not any(marker in value.lower() for marker in ("your_", "replace", "placeholder")))

def gemini_request_error(status: int, data: object = None) -> GeminiScanError:
    """Only expose our messages; upstream errors may contain credentials or source."""
    error = data.get("error", {}) if isinstance(data, dict) else {}
    details = error.get("details", []) if isinstance(error, dict) else []
    reasons = {item.get("reason") for item in details if isinstance(item, dict)
               and isinstance(item.get("reason"), str)} if isinstance(details, list) else set()
    if reasons & {"API_KEY_INVALID", "API_KEY_EXPIRED"} or status == 401:
        message = "Gemini rejected the API key. Replace it in Settings with a valid Google AI Studio key."
    elif status == 403:
        message = "Gemini denied API access (HTTP 403). Check the key's API restrictions and project permissions in Google AI Studio."
    elif status == 404:
        message = "Gemini model unavailable (HTTP 404). Check GEMINI_MODEL against models available to your API project, then restart the backend."
    elif status == 400:
        message = "Gemini rejected the request (HTTP 400). Check model support for structured output and API availability for your project/region."
    elif status == 429:
        message = "Gemini quota or rate limit reached (HTTP 429). Check your API quota and retry."
    elif status in (500, 502, 503, 504):
        message = "Gemini is temporarily unavailable. Please retry."
    else:
        message = "Gemini request failed. Check API access and retry."
    return GeminiScanError(429 if status == 429 else 502, message + " No scan verdict was generated.")


def gemini_response_error(response: httpx.Response) -> GeminiScanError:
    try:
        data = response.json()
    except ValueError:
        data = None
    return gemini_request_error(response.status_code, data)

async def generate_gemini_security(prompt: str, system: str, model_cls: Type[T], api_key: Optional[str] = None) -> T:
    """Strict structured Gemini call: no tools, code execution, or demo fallback."""
    if not gemini_scan_configured(api_key):
        raise GeminiScanError(503, "Add a Gemini API key in Settings to run a repository security review.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    payload = {"systemInstruction": {"parts": [{"text": system}]},
               "contents": [{"role": "user", "parts": [{"text": prompt}]}],
               "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192,
                   "responseFormat": {"text": {"mimeType": "APPLICATION_JSON", "schema": model_cls.model_json_schema()}}}}
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, headers={"x-goog-api-key": api_key if api_key is not None else settings.GEMINI_API_KEY}, json=payload)
    except httpx.RequestError as exc:
        raise GeminiScanError(502, "Gemini could not be reached. Try again; no scan verdict was generated.") from exc
    if response.status_code != 200:
        raise gemini_response_error(response)
    try:
        data = response.json()
        candidate = data.get("candidates", [])[0]
        if candidate.get("finishReason") != "STOP":
            raise ValueError("incomplete or blocked response")
        text = "".join(part.get("text", "") for part in candidate["content"]["parts"] if not part.get("thought"))
        return model_cls.model_validate_json(text)
    except (ValueError, IndexError, KeyError, TypeError) as exc:
        raise GeminiScanError(502, "Gemini returned a blocked, incomplete, or invalid response. No scan verdict was generated; try again.") from exc

def gemini_chat_error(status: int) -> GeminiScanError:
    if status == 429:
        return GeminiScanError(429, "Gemini quota or rate limit reached. Check your API quota and retry.")
    if status in (400, 401, 403):
        return GeminiScanError(502, "Gemini rejected the request. Check your API key in Settings and your model access.")
    return GeminiScanError(502, "Gemini is unavailable. Check GEMINI_MODEL and API access, then retry.")


async def gemini_events(response: httpx.Response) -> AsyncGenerator[dict, None]:
    event = []
    async for line in response.aiter_lines():
        if line.startswith("data:"):
            event.append(line[5:].lstrip())
        elif not line and event:
            yield json.loads("\n".join(event))
            event = []
    if event:
        yield json.loads("\n".join(event))


def gemini_chat_chunk(data: dict) -> tuple[str, bool]:
    if data.get("error") or data.get("promptFeedback", {}).get("blockReason"):
        raise GeminiScanError(502, "Gemini could not answer this request. Try rephrasing your message.")
    candidates = data.get("candidates", [])
    if not candidates:
        if data.get("usageMetadata"):
            return "", False
        raise GeminiScanError(502, "Gemini returned no answer. Try again.")
    candidate = candidates[0]
    reason = candidate.get("finishReason")
    if reason and reason != "STOP":
        raise GeminiScanError(502, "Gemini could not finish this response. Try a shorter message or different context.")
    parts = candidate.get("content", {}).get("parts", [])
    return "".join(part.get("text", "") for part in parts if not part.get("thought")), reason == "STOP"


async def stream_gemini_text(prompt: str, system: Optional[str], api_key: str,
                             model: str, temperature: float) -> AsyncGenerator[str, None]:
    if not gemini_scan_configured(api_key):
        raise GeminiScanError(503, "Add a Gemini API key in Settings to use the AI assistant.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
               "generationConfig": {"temperature": temperature, "maxOutputTokens": 8192}}
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    completed, received = False, False
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, params={"alt": "sse"},
                                     headers={"x-goog-api-key": api_key}, json=payload) as response:
                if response.status_code != 200:
                    raise gemini_chat_error(response.status_code)
                async for data in gemini_events(response):
                    text, stopped = gemini_chat_chunk(data)
                    completed = completed or stopped
                    if text:
                        received = True
                        yield text
        if not completed or not received:
            raise GeminiScanError(502, "Gemini returned an empty or interrupted response. Please retry.")
    except httpx.RequestError as exc:
        raise GeminiScanError(502, "Gemini could not be reached. Check your connection and try again.") from exc
    except (ValueError, KeyError, IndexError, TypeError, AttributeError) as exc:
        raise GeminiScanError(502, "Gemini returned an invalid response. Please retry.") from exc


class LLMProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2
    ) -> str:
        pass

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.5
    ) -> AsyncGenerator[str, None]:
        pass

    def count_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)


class MockProvider(LLMProvider):
    """Fallback provider when no external API key is provided."""
    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2
    ) -> str:
        logger.info("Using MockProvider for generate")
        if json_mode:
            # Detect type of prompt - check specific categories first
            if "quality" in prompt.lower() or (system and "auditor" in system.lower()):
                return json.dumps({
                    "overall_score": 88,
                    "dimensions": {
                        "maintainability": 85,
                        "security": 92,
                        "complexity": 84,
                        "documentation": 90
                    },
                    "metrics": {
                        "loc": 45,
                        "comment_ratio": 0.22,
                        "cyclomatic_complexity": 4
                    },
                    "recommendations": [
                        "Add type annotations to all public functions",
                        "Extract complex condition expressions into named booleans"
                    ]
                })
            elif "refactor" in prompt.lower() or (system and "architect" in system.lower()):
                return json.dumps({
                    "suggestions": [
                        {
                            "id": "mock-refactor-1",
                            "title": "Extract Helper Method",
                            "impact": "medium",
                            "category": "readability",
                            "rationale": "Separates concerns and improves testability.",
                            "before_code": "# Long procedure code here...",
                            "after_code": "# Extracted clean function...",
                            "risk_level": "low"
                        }
                    ],
                    "summary": "1 readability optimization suggested."
                })
            elif "purpose" in prompt.lower() or (system and "mentor" in system.lower()):
                return json.dumps({
                    "purpose": "Processes incoming inputs and performs business logic transformations.",
                    "walkthrough": [
                        "Validates parameters and configurations",
                        "Applies transformation and state updates",
                        "Returns computed output cleanly"
                    ],
                    "key_concepts": ["Modular Design", "Input Validation", "Defensive Programming"],
                    "time_complexity": "O(N) linear time relative to input length",
                    "space_complexity": "O(1) constant auxiliary space",
                    "pitfalls": ["High memory consumption on massive input arrays"],
                    "line_notes": [{"line": 1, "note": "Primary function definition"}]
                })
            elif "findings" in prompt.lower() or "bug" in prompt.lower() or (system and "security" in system.lower()):
                return json.dumps({
                    "findings": [
                        {
                            "id": "mock-bug-1",
                            "title": "Potential Unhandled Input Exception",
                            "severity": "medium",
                            "category": "Reliability",
                            "cwe": "CWE-754",
                            "line_start": 3,
                            "line_end": 7,
                            "explanation": "Input parameters are accessed without null checks or boundaries.",
                            "fix": "Add boundary validation checks or try/except block.",
                            "fixed_code": "# Validated code block\nif not data:\n    raise ValueError('Input data is empty')",
                            "confidence": 0.92
                        }
                    ],
                    "summary": "1 potential vulnerability identified during static analysis."
                })
        return "DevMind AI analysis completed successfully."

    async def stream(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.5
    ) -> AsyncGenerator[str, None]:
        chunks = [
            "DevMind ", "AI: ", "Analyzing ", "codebase ", "context... \n\n",
            "Based ", "on ", "the provided ", "files, ", "the architecture ", "follows ",
            "modular ", "principles. ", "Let ", "me know ", "if you'd ", "like me ", "to inspect ",
            "specific ", "modules."
        ]
        for c in chunks:
            await asyncio.sleep(0.05)
            yield c


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model_name: str = "gemini-3.8-flash", initialize: bool = True):
        self.api_key = api_key
        self.model_name = model_name
        self._client = None
        if api_key and initialize:
            try:
                from google import genai
                self._client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning("Could not initialize official google.genai")

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2
    ) -> str:
        if not self._client:
            return await MockProvider().generate(prompt, system, json_mode, temperature)
        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                temperature=temperature,
                system_instruction=system if system else None,
                response_mime_type="application/json" if json_mode else None
            )
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            return response.text or ""
        except Exception as e:
            logger.error(f"Gemini API error: {e}. Falling back to mock response.")
            return await MockProvider().generate(prompt, system, json_mode, temperature)

    async def stream(
        self, prompt: str, system: Optional[str] = None, temperature: float = 0.5
    ) -> AsyncGenerator[str, None]:
        async for text in stream_gemini_text(prompt, system, self.api_key, self.model_name, temperature):
            yield text


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model_name = model_name
        self._client = None
        if api_key:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=api_key)
            except Exception as e:
                logger.warning(f"Could not initialize AsyncOpenAI: {e}")

    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2
    ) -> str:
        if not self._client:
            return await MockProvider().generate(prompt, system, json_mode, temperature)
        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"} if json_mode else None
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI generate error: {e}")
            return await MockProvider().generate(prompt, system, json_mode, temperature)

    async def stream(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.5
    ) -> AsyncGenerator[str, None]:
        if not self._client:
            async for chunk in MockProvider().stream(prompt, system, temperature):
                yield chunk
            return
        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            stream_resp = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                stream=True
            )
            async for chunk in stream_resp:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as e:
            logger.error(f"OpenAI stream error: {e}")
            yield f"\n[Error streaming from OpenAI: {e}]"


class LLMGateway:
    def __init__(self):
        self.provider = self._init_provider()

    def _init_provider(self) -> LLMProvider:
        prov_type = settings.LLM_PROVIDER.lower()
        if prov_type == "gemini" and settings.GEMINI_API_KEY:
            return GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
        elif prov_type == "openai" and settings.OPENAI_API_KEY:
            return OpenAIProvider(settings.OPENAI_API_KEY, settings.OPENAI_MODEL)
        elif prov_type == "gemini":
            return GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
        elif prov_type == "openai":
            return OpenAIProvider(settings.OPENAI_API_KEY, settings.OPENAI_MODEL)
        return MockProvider()

    def clean_json_string(self, text: str) -> str:
        """Strip markdown code fence blocks if returned by model."""
        clean = text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        elif clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        return clean.strip()

    async def generate_json(
        self,
        prompt: str,
        model_cls: Type[T],
        system: Optional[str] = None,
        temperature: float = 0.2,
        retries: int = 1
    ) -> T:
        for attempt in range(retries + 1):
            raw_text = await self.provider.generate(
                prompt=prompt,
                system=system,
                json_mode=True,
                temperature=temperature
            )
            cleaned = self.clean_json_string(raw_text)
            try:
                data = json.loads(cleaned)
                return model_cls.model_validate(data)
            except Exception as err:
                logger.warning(f"JSON validation attempt {attempt + 1} failed: {err}")
                if attempt == retries:
                    # Return fallback instance or raise
                    raise ValueError(f"Failed to parse LLM output into {model_cls.__name__}: {err}\nOutput was: {raw_text}")
                await asyncio.sleep(0.5)

gateway = LLMGateway()
