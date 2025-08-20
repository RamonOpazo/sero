import pymupdf
from typing import Dict, List, Any
from loguru import logger


class PDFRedactionError(Exception):
    pass


class PDFRedactor:
    def __init__(self):
        # default watermark config
        self._watermark_text_color = (1, 0, 0)  # red
        self._watermark_fontsize = 10
        self._watermark_margin = (10, 14)  # x, y from top-left
        self._redaction_fill = (0, 0, 0)  # black fill for redaction boxes
        pass
    
    def redact_document(self, pdf_data: bytes, selections: List[Dict[str, Any]]) -> bytes:
        try:
            doc = pymupdf.open("pdf", pdf_data)
            
            if doc.is_encrypted:
                raise PDFRedactionError("PDF is encrypted")
            
            if doc.page_count == 0:
                raise PDFRedactionError("PDF has no pages")
            
            processed_pages = set()
            redaction_count = 0
            
            # Perform redactions per selection/page
            for selection in selections:
                page_num = selection.get('page_number')
                if page_num is None:
                    for page_idx in range(doc.page_count):
                        count = self._redact_page(doc.load_page(page_idx), [selection])
                        redaction_count += count
                        processed_pages.add(page_idx)
                else:
                    page_idx = page_num - 1
                    if 0 <= page_idx < doc.page_count:
                        count = self._redact_page(doc.load_page(page_idx), [selection])
                        redaction_count += count
                        processed_pages.add(page_idx)
            
            # Ensure watermark is applied on every page
            for page_idx in range(doc.page_count):
                page = doc.load_page(page_idx)
                self._insert_watermark(page)
            
            # Write final PDF bytes
            redacted_data = doc.tobytes()
            doc.close()
            
            logger.info(f"Redacted {redaction_count} areas across {len(processed_pages)} pages")
            return redacted_data
            
        except Exception as e:
            if isinstance(e, PDFRedactionError):
                raise
            raise PDFRedactionError(f"Redaction failed: {str(e)}")
    
    def _redact_page(self, page: pymupdf.Page, selections: List[Dict[str, Any]]) -> int:
        redaction_count = 0
        page_rect = page.rect

        # Precompute selection rects (support multiple candidates per selection for orientation auto-detect)
        selection_rects: list[pymupdf.Rect] = []
        for selection in selections:
            rects = self._selection_to_rects(selection, page_rect)
            selection_rects.extend(rects)

        # 1) Visual marking: draw rectangles around words inside selections
        try:
            words = page.get_text("words")  # [x0, y0, x1, y1, word, block_no, line_no, word_no]
            for w in words:
                wr = pymupdf.Rect(w[0], w[1], w[2], w[3])
                if any(wr.intersects(sr) for sr in selection_rects):
                    page.draw_rect(wr, color=(1, 0, 0), width=0.8, fill=None)
        except Exception as e:
            logger.warning(f"Failed to mark words on page {page.number+1}: {str(e)}")

        # 2) Redaction annotations for the whole selection area (still keep this path)
        for rect in selection_rects:
            try:
                page.add_redact_annot(rect, fill=self._redaction_fill)
                redaction_count += 1
            except Exception as e:
                logger.warning(f"Failed to add redaction annot on page {page.number+1}: {str(e)}")

        if redaction_count > 0:
            # Apply redactions, ensuring text/graphics/images all affected
            page.apply_redactions(images=1, graphics=1, text=1)

        return redaction_count
    
    def _selection_to_rects(self, selection: Dict[str, Any], page_rect: pymupdf.Rect) -> list[pymupdf.Rect]:
        rects: list[pymupdf.Rect] = []
        try:
            x = float(selection['x'])
            y = float(selection['y'])
            width = float(selection['width'])
            height = float(selection['height'])
            
            # Determine if coordinates are normalized (0..1) or absolute (points)
            normalized = 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 < width <= 1.0 and 0.0 < height <= 1.0
            page_width = page_rect.width
            page_height = page_rect.height

            candidates: list[tuple[float,float,float,float]] = []
            if normalized:
                # Candidate A: assume (0,0) top-left, y grows down
                x0a = x * page_width
                y0a = y * page_height
                x1a = x0a + (width * page_width)
                y1a = y0a + (height * page_height)
                candidates.append((x0a, y0a, x1a, y1a))
                # Candidate B: assume (0,0) bottom-left, y grows up (flip y)
                y0b = (1.0 - (y + height)) * page_height
                x0b = x * page_width
                x1b = x0b + (width * page_width)
                y1b = y0b + (height * page_height)
                candidates.append((x0b, y0b, x1b, y1b))
            else:
                candidates.append((x, y, x + width, y + height))

            # Normalize, clamp and convert to Rects
            for (x0, y0, x1, y1) in candidates:
                x0 = max(page_rect.x0, min(page_rect.x1, x0))
                y0 = max(page_rect.y0, min(page_rect.y1, y0))
                x1 = max(page_rect.x0, min(page_rect.x1, x1))
                y1 = max(page_rect.y0, min(page_rect.y1, y1))
                if x1 < x0:
                    x0, x1 = x1, x0
                if y1 < y0:
                    y0, y1 = y1, y0
                r = pymupdf.Rect(x0, y0, x1, y1)
                # Skip zero-area rects
                if r.width > 0 and r.height > 0:
                    rects.append(r)
            
            return rects
        except (KeyError, TypeError, ValueError):
            logger.warning(f"Invalid selection data: {selection}")
            return rects
    
    def _insert_watermark(self, page: pymupdf.Page) -> None:
        try:
            from datetime import datetime
            year = datetime.utcnow().year
            text = f"Processed by SERO - {year}"
            x, y = self._watermark_margin
            # Ensure watermark is within page bounds
            y = max(y, 10)
            page.insert_text((x, y), text, fontsize=self._watermark_fontsize, color=self._watermark_text_color)
        except Exception as e:
            logger.warning(f"Failed to insert watermark: {str(e)}")


def create_redactor() -> PDFRedactor:
    return PDFRedactor()
