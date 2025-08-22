from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Iterable
from pydantic import BaseModel

from backend.api.schemas.selections_schema import SelectionCreate


class GenerateSelectionsRequest(BaseModel):
    document_id: str
    text_context: str | None = None  # future: extracted OCR/text from PDF
    prompts: list[str] = []  # high-level prompts already composed


class GenerateSelectionsResponse(BaseModel):
    selections: list[SelectionCreate]


class AiService(ABC):
    @abstractmethod
    async def generate_selections(self, request: GenerateSelectionsRequest) -> GenerateSelectionsResponse:
        """Given document context and prompts, return AI-generated selections.
        Selections must include a confidence value when AI generated so is_ai_generated is True.
        """
        raise NotImplementedError


# Default service factory (can be extended to support multiple providers)
from backend.core.config import settings as app_settings
from backend.core.ai_ollama import OllamaClient, OllamaOptions

class OllamaAiService(AiService):
    def __init__(self) -> None:
        self.client = OllamaClient(base_url=app_settings.ai.host, timeout=app_settings.ai.timeout)

    async def generate_selections(self, request: GenerateSelectionsRequest) -> GenerateSelectionsResponse:
        # For now, generate a combined context and return no selections (stub)
        final_prompt = "\n\n---\n\n".join(request.prompts)
        _ = await self.client.health()  # potential health check
        _ = await self.client.generate(model=app_settings.ai.model, prompt=final_prompt, options=OllamaOptions())
        return GenerateSelectionsResponse(selections=[])


def get_ai_service() -> AiService:
    # Future: switch by provider in AiSettings
    return OllamaAiService()

