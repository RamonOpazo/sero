from __future__ import annotations
from abc import ABC, abstractmethod

from src.core.pdf_redactor import AreaSelection, redactor as core_redactor


class RedactorService(ABC):
    @abstractmethod
    def redact(self, *, pdf_data: bytes, selections: list[AreaSelection]) -> bytes:
        """Redact the given PDF bytes using the provided selections and return new bytes."""
        raise NotImplementedError


class CorePdfRedactorService(RedactorService):
    def redact(self, *, pdf_data: bytes, selections: list[AreaSelection]) -> bytes:
        return core_redactor.redact_document(pdf_data=pdf_data, selections=selections)


_service_singleton: RedactorService | None = None


def get_redactor_service() -> RedactorService:
    global _service_singleton
    if _service_singleton is None:
        _service_singleton = CorePdfRedactorService()
    return _service_singleton

