import pymupdf
from typing import Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict
from loguru import logger


class AreaSelection(BaseModel):
    x: float
    y: float
    width: float
    height: float
    page_number: int | None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    def as_rect(self, page: pymupdf.Page) -> pymupdf.Rect:
        # Use page height for Y coordinates (bug fix)
        absolute_x0 = self.x * page.rect.width
        absolute_y0 = self.y * page.rect.height
        absolute_x1 = absolute_x0 + (self.width * page.rect.width)
        absolute_y1 = absolute_y0 + (self.height * page.rect.height)
        return pymupdf.Rect(absolute_x0, absolute_y0, absolute_x1, absolute_y1)


class WatermarkSettings(BaseModel):
    anchor: Literal["NW", "NE", "SW", "SE", "ZH"] = Field("NW")
    padding: int = Field(10)
    color: str = Field("#ff0000")
    size: float = Field(8)

    def as_anchor_point(self, page: pymupdf.Page) -> tuple[float, float]:
        if self.anchor == "NW":
            return page.rect.x0 + self.padding, page.rect.y0 + self.padding
        if self.anchor == "NE":
            return page.rect.x1 - self.padding, page.rect.y0 + self.padding
        if self.anchor == "SW":
            return page.rect.x0 + self.padding, page.rect.y1 - self.padding
        if self.anchor == "SE":
            return page.rect.x1 - self.padding, page.rect.y1 - self.padding
        if self.anchor == "ZH":
            return page.rect.x0 + page.rect.width / 2, page.rect.y0 + page.rect.height / 2
        raise ValueError(f"Unknown anchor position: {self.anchor}")


def _get_normalized_rgb(color: str) -> tuple[float, float, float]:
    hex_str = color.lstrip("#")
    return tuple(int(hex_str[i:i+2], 16) / 255 for i in (0, 2, 4))


class PdfRedactionError(Exception):
    pass


class PdfRedactor:
    def __init__(self, watermark_settings: WatermarkSettings) -> None:
        self._ws = watermark_settings

    @staticmethod
    def _get_anchor_point(anchor: Literal["NW", "NE", "SW", "SE", "ZH"], padding: int, page_rect: pymupdf.Rect) -> tuple[float, float]:
        match anchor:
            case "NW":
                return page_rect.x0 + padding, page_rect.y0 + padding
            case "NE":
                return page_rect.x1 - padding, page_rect.y0 + padding
            case "SW":
                return page_rect.x0 + padding, page_rect.y1 - padding
            case "SE":
                return page_rect.x1 - padding, page_rect.y1 - padding
            case "ZH":
                return page_rect.x0 + page_rect.width / 2, page_rect.y0 + page_rect.height / 2
            case _:
                raise ValueError(f"Unknown anchor position: {anchor}")

    def _insert_watermark(self, text: str, page: pymupdf.Page) -> None:
        point = self._ws.as_anchor_point(page=page)
        color = _get_normalized_rgb(color=self._ws.color)
        page.insert_text(point=point, text=text, fontsize=self._ws.size, fontname="courier", color=color, overlay=True)

    def _normalize_and_partition_selections(self, total_pages: int, selections: list[AreaSelection]) -> dict[int, list[AreaSelection]]:
        # Validate and normalize page numbers to 0-based. None means all pages.
        per_page: dict[int, list[AreaSelection]] = {i: [] for i in range(total_pages)}
        for sel in selections:
            if sel.page_number is None:
                for i in range(total_pages):
                    per_page[i].append(sel)
                continue
            # Treat provided page numbers as 0-based
            if sel.page_number < 0 or sel.page_number >= total_pages:
                raise PdfRedactionError(
                    f"Selection targets out-of-range page (page_number={sel.page_number}); doc has {total_pages} pages",
                )
            per_page[sel.page_number].append(sel)
        return per_page

    def redact_document(self, pdf_data: bytes, selections: list[AreaSelection]) -> bytes:
        logger.info(f"Redactor received {len(selections)} selections")

        with pymupdf.open("pdf", pdf_data) as doc:
            if doc.is_encrypted:
                raise PdfRedactionError("PDF is encrypted")

            if doc.page_count == 0:
                raise PdfRedactionError("PDF has no pages")

            paged_selections = self._normalize_and_partition_selections(doc.page_count, selections)

            total_redactions = 0
            for page_idx in range(doc.page_count):
                page = doc.load_page(page_idx)
                if not paged_selections[page_idx]:
                    # Still watermark pages even without selections
                    pass
                else:
                    total_redactions += self._redact_page(page=page, selections=paged_selections[page_idx])
                    # Apply the redactions to actually remove content
                    page.apply_redactions()

            text = f"Processed by SERO - {datetime.now(tz=timezone.utc).year}"
            for page_idx in range(doc.page_count):
                page = doc.load_page(page_idx)
                self._insert_watermark(text=text, page=page)

            logger.info(f"Redacted {total_redactions} areas across {doc.page_count} pages")

            # Return bytes while document context is active
            return doc.tobytes()

    def _redact_page(self, page: pymupdf.Page, selections: list[AreaSelection]) -> int:
        fill = _get_normalized_rgb(color="#000000")
        for sel in selections:
            page.add_redact_annot(sel.as_rect(page), fill=fill)
        return len(selections)


# Singleton instance
redactor = PdfRedactor(watermark_settings=WatermarkSettings())
