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
    def generate_selections(self, request: GenerateSelectionsRequest) -> GenerateSelectionsResponse:
        """Given document context and prompts, return AI-generated selections.
        Selections must include a confidence value when AI generated so is_ai_generated is True.
        """
        raise NotImplementedError

