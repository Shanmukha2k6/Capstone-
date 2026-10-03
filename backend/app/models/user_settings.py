from typing import Literal

from pydantic import BaseModel, SecretStr, field_validator


class GeminiKeyRequest(BaseModel):
    api_key: SecretStr

    @field_validator("api_key")
    @classmethod
    def validate_key(cls, value: SecretStr) -> SecretStr:
        key = value.get_secret_value().strip()
        if not 20 <= len(key) <= 256 or not key.isascii() or any(char.isspace() for char in key):
            raise ValueError("Enter a Gemini API key with 20–256 non-whitespace ASCII characters.")
        return SecretStr(key)


class GeminiKeyStatus(BaseModel):
    configured: bool
    session_key: bool
    source: Literal["session", "server", "none"]
    model: str
    expires_in_seconds: int | None = None
