from __future__ import annotations
from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from typing import Any

from src.api.schemas.selections_schema import SelectionCreate
from src.core.config import settings as app_settings
from src.core.ai_ollama import OllamaClient, OllamaOptions
from src.core.prompt_composer import compose_selection_instructions
from src.core.geometry import NormRect, merge_rects


class AiRuntimeSettings(BaseModel):
    provider: str = Field(default="ollama")
    model_name: str = Field(default_factory=lambda: app_settings.ai.model)
    temperature: float | None = None
    top_p: float | None = None
    max_tokens: int | None = None
    num_ctx: int | None = None
    seed: int | None = None
    stop_tokens: list[str] | None = None
    system_prompt: str | None = None


class GenerateSelectionsRequest(BaseModel):
    document_id: str
    system_prompt: str | None = None
    text_context: str | None = None  # future: extracted OCR/text from PDF
    prompts: list[str] = []  # high-level prompts already composed
    ai_settings: AiRuntimeSettings | None = None


class GenerateSelectionsResponse(BaseModel):
    selections: list[SelectionCreate]


class ProviderCatalog(BaseModel):
    name: str = Field(..., description="Provider name, e.g., 'ollama'")
    models: list[str] = Field(default_factory=list, description="Available model names for this provider")


class AiCatalog(BaseModel):
    providers: list[ProviderCatalog] = Field(default_factory=list)


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

    @abstractmethod
    async def catalog(self) -> AiCatalog:
        """Return available providers and their models."""
        raise NotImplementedError


class OllamaAiService(AiService):
    def __init__(self) -> None:
        self.client = OllamaClient(base_url=app_settings.ai.host, timeout=app_settings.ai.timeout)

    async def health(self) -> bool:
        return await self.client.health()

    async def catalog(self) -> AiCatalog:
        models = await self.client.list_models()
        provider = ProviderCatalog(name="ollama", models=models)
        return AiCatalog(providers=[provider])

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
            system_prompt=(request.ai_settings.system_prompt if request.ai_settings and request.ai_settings.system_prompt else request.system_prompt),
            rules=request.prompts,
        )
        # Destructure options from ai_settings when provided
        rs = request.ai_settings
        opts = OllamaOptions(
            temperature=(rs.temperature if rs else None),
            top_p=(rs.top_p if rs else None),
            max_tokens=(rs.max_tokens if rs else None),
            num_ctx=(rs.num_ctx if rs else None),
            seed=(rs.seed if rs else None),
            stop=(rs.stop_tokens if rs and rs.stop_tokens else None),
        )
        model_name = (rs.model_name if rs and rs.model_name else app_settings.ai.model)
        raw = await self.client.generate(model=model_name, prompt=final_prompt, options=opts)

        # Parse JSON items and construct rects
        items = self._parse_model_raw(raw)
        rects: list[NormRect] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            if any(k not in item for k in ("x", "y", "width", "height")):
                continue
            try:
                rects.append(NormRect(
                    page_number=item.get("page_number"),
                    x=self._clamp01(item.get("x"), 0.0),
                    y=self._clamp01(item.get("y"), 0.0),
                    width=self._clamp01(item.get("width"), 0.0),
                    height=self._clamp01(item.get("height"), 0.0),
                    confidence=(float(item.get("confidence")) if item.get("confidence") is not None else None),
                ))
            except Exception:
                continue

        # Coalesce overlapping/touching rects per page
        merged = merge_rects(rects)

        # Convert to SelectionCreate with request.document_id
        selections: list[SelectionCreate] = []
        for r in merged:
            try:
                selections.append(SelectionCreate(
                    page_number=r.page_number,
                    x=r.x,
                    y=r.y,
                    width=r.width,
                    height=r.height,
                    confidence=r.confidence,
                    committed=False,
                    document_id=request.document_id,
                ))
            except Exception:
                continue
        return GenerateSelectionsResponse(selections=selections)


def get_ai_service() -> AiService:
    # Future: switch by provider in AiSettings
    return OllamaAiService()


def to_runtime_settings(obj: Any | None) -> AiRuntimeSettings | None:
    """Construct AiRuntimeSettings from a DB model or schema-like object.
    Accepts attributes provider, model_name, temperature, top_p, max_tokens, num_ctx, seed, stop_tokens, system_prompt.
    Returns None if obj is None.
    """
    if obj is None:
        return None
    return AiRuntimeSettings(
        provider=getattr(obj, "provider", "ollama"),
        model_name=getattr(obj, "model_name", app_settings.ai.model),
        temperature=getattr(obj, "temperature", None),
        top_p=getattr(obj, "top_p", None),
        max_tokens=getattr(obj, "max_tokens", None),
        num_ctx=getattr(obj, "num_ctx", None),
        seed=getattr(obj, "seed", None),
        stop_tokens=getattr(obj, "stop_tokens", None),
        system_prompt=getattr(obj, "system_prompt", None),
    )

