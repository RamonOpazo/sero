from __future__ import annotations
from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from typing import Any

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

    @staticmethod
    def _clamp01(val: float | int | None, default: float = 0.0) -> float:
        try:
            f = float(val) if val is not None else float(default)
        except Exception:
            f = float(default)
        return max(0.0, min(1.0, f))

    @staticmethod
    def _parse_model_raw(raw: str) -> list[dict[str, Any]]:
        import json
        try:
            data = json.loads(raw)
        except Exception:
            return []
        if isinstance(data, dict):
            it = data.get("selections", [])
            return it if isinstance(it, list) else []
        if isinstance(data, list):
            return data
        return []

    async def generate_selections(self, request: GenerateSelectionsRequest) -> GenerateSelectionsResponse:
        # Ask the model to output strict JSON for selections
        final_prompt = compose_selection_instructions(
            system_prompt=request.system_prompt,
            rules=request.prompts,
        )
        raw = await self.client.generate(model=app_settings.ai.model, prompt=final_prompt, options=OllamaOptions())
        
        # Parse JSON into SelectionCreate objects with clamping and defaults
        selections: list[SelectionCreate] = []
        items = self._parse_model_raw(raw)
        for item in items:
            # Basic required fields for a valid selection
            if not isinstance(item, dict):
                continue
            if any(k not in item for k in ("x", "y", "width", "height")):
                continue
            try:
                selections.append(SelectionCreate(
                    page_number=item.get("page_number"),
                    x=self._clamp01(item.get("x"), 0.0),
                    y=self._clamp01(item.get("y"), 0.0),
                    width=self._clamp01(item.get("width"), 0.0),
                    height=self._clamp01(item.get("height"), 0.0),
                    confidence=(float(item.get("confidence")) if item.get("confidence") is not None else None),
                    committed=False,
                    document_id="00000000-0000-4000-8000-000000000000",
                ))
            except Exception:
                # Skip invalid items rather than failing the entire response
                continue
        return GenerateSelectionsResponse(selections=selections)


def get_ai_service() -> AiService:
    # Future: switch by provider in AiSettings
    return OllamaAiService()

