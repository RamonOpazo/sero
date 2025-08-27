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

    async def generate_stream(self, model: str, prompt: str, options: OllamaOptions | None = None):
        """Async generator yielding incremental response text chunks from Ollama.
        Uses /api/generate with stream=True which returns JSON lines with 'response' and 'done'.
        """
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": True,
        }
        if options is not None:
            payload["options"] = options.model_dump(exclude_none=True)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as r:
                r.raise_for_status()
                async for line in r.aiter_lines():
                    if not line:
                        continue
                    try:
                        obj = httpx.Response(200, text=line).json()
                    except Exception:
                        # attempt best-effort parse via json module if line isn't a full httpx json
                        import json as _json
                        try:
                            obj = _json.loads(line)
                        except Exception:
                            continue
                    delta = obj.get("response") if isinstance(obj, dict) else None
                    if isinstance(delta, str) and delta:
                        yield delta
                    if isinstance(obj, dict) and obj.get("done") is True:
                        break

    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                r.raise_for_status()
                data = r.json()
                models = data.get("models", [])
                names: list[str] = []
                if isinstance(models, list):
                    for m in models:
                        name = (m or {}).get("name")
                        if isinstance(name, str):
                            names.append(name)
                return names
        except Exception:
            return []

