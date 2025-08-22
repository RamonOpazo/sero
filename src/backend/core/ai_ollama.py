from __future__ import annotations
from typing import Any
import httpx
from pydantic import BaseModel


class OllamaOptions(BaseModel):
    temperature: float | None = None
    top_p: float | None = None
    max_tokens: int | None = None
    num_ctx: int | None = None
    seed: int | None = None
    stop: list[str] | None = None


class OllamaClient:
    def __init__(self, base_url: str, timeout: int = 120) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def generate(self, model: str, prompt: str, options: OllamaOptions | None = None) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }
        if options is not None:
            payload["options"] = options.model_dump(exclude_none=True)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(f"{self.base_url}/api/generate", json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("response", "")

