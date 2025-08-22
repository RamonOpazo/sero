from __future__ import annotations
from abc import ABC, abstractmethod
from pydantic import BaseModel

from backend.api.schemas.selections_schema import SelectionCreate
from backend.core.config import settings as app_settings
from backend.core.ai_ollama import OllamaClient, OllamaOptions
from backend.core.prompt_composer import compose_selection_instructions


class GenerateSelectionsRequest(BaseModel):
    document_id: str
    system_prompt: str | None = None
    text_context: str | None = None  # future: extracted OCR/text from PDF
    prompts: list[str] = []  # high-level prompts already composed


class GenerateSelectionsResponse(BaseModel):
    selections: list[SelectionCreate]


class AiService(ABC):
    @abstractmethod
    async def health(self) -> bool:
        """Provider health check."""
        raise NotImplementedError

    @abstractmethod
    async def generate_selections(self, request: GenerateSelectionsRequest) -> GenerateSelectionsResponse:
        """Given document context and prompts, return AI-generated selections.
        Selections must include a confidence value when AI generated so is_ai_generated is True.
        """
        raise NotImplementedError


class OllamaAiService(AiService):
    def __init__(self) -> None:
        self.client = OllamaClient(base_url=app_settings.ai.host, timeout=app_settings.ai.timeout)

    async def health(self) -> bool:
        return await self.client.health()

    async def generate_selections(self, request: GenerateSelectionsRequest) -> GenerateSelectionsResponse:
        # Ask the model to output strict JSON for selections
        final_prompt = compose_selection_instructions(
            system_prompt=request.system_prompt,
            rules=request.prompts,
        )
        raw = await self.client.generate(model=app_settings.ai.model, prompt=final_prompt, options=OllamaOptions())
        
        # Parse JSON into SelectionCreate objects
        import json
        selections: list[SelectionCreate] = []
        try:
            data = json.loads(raw)
            for item in data.get("selections", []):
                selections.append(SelectionCreate(
                    page_number=item.get("page_number"),
                    x=float(item.get("x", 0)),
                    y=float(item.get("y", 0)),
                    width=float(item.get("width", 0)),
                    height=float(item.get("height", 0)),
                    confidence=float(item.get("confidence", 0)),
                    committed=False,
                    document_id="00000000-0000-0000-0000-000000000000",
                ))
        except Exception:
            selections = []
        return GenerateSelectionsResponse(selections=selections)


def get_ai_service() -> AiService:
    # Future: switch by provider in AiSettings
    return OllamaAiService()

