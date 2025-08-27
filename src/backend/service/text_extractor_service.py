from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
import pymupdf


class TextExtractorService(ABC):
    @abstractmethod
    def extract_text(self, *, pdf_data: bytes, max_chars_per_page: int = 2000, max_pages: Optional[int] = None) -> str:
        """Extract plain text from a PDF, page-indexed, with truncation per page."""
        raise NotImplementedError


class PyMuPDFTextExtractor(TextExtractorService):
    def extract_text(self, *, pdf_data: bytes, max_chars_per_page: int = 2000, max_pages: Optional[int] = None) -> str:
        parts: list[str] = []
        with pymupdf.open("pdf", pdf_data) as doc:
            pages = doc.page_count
            limit = min(pages, max_pages) if isinstance(max_pages, int) and max_pages is not None else pages
            for i in range(limit):
                page = doc.load_page(i)
                text = page.get_text("text") or ""
                if max_chars_per_page > 0 and len(text) > max_chars_per_page:
                    text = text[:max_chars_per_page]
                parts.append(f"Page {i}:\n{text}")
        return "\n\n---\n\n".join(parts)


_singleton: TextExtractorService | None = None


def get_text_extractor_service() -> TextExtractorService:
    global _singleton
    if _singleton is None:
        _singleton = PyMuPDFTextExtractor()
    return _singleton

