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
            logger.info("Redactor received {} selections", len(selections))
            if len(selections) > 0:
                logger.debug("Selections sample (first 3): {}", selections[:3])
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
                    try:
                        pn = int(page_num)
                    except Exception:
                        logger.warning(f"Invalid page_number in selection: {page_num}")
                        continue
                    # Support 0-based or 1-based inputs
                    page_idx = pn - 1 if pn >= 1 else pn
                    if 0 <= page_idx < doc.page_count:
                        count = self._redact_page(doc.load_page(page_idx), [selection])
                        redaction_count += count
                        processed_pages.add(page_idx)
                    else:
                        logger.warning(f"Selection targets out-of-range page index {page_idx} (from page_number={pn}); doc has {doc.page_count} pages")
            
            # Apply all redactions: fall back to per-page application for compatibility
            try:
                for page_idx in range(doc.page_count):
                    page = doc.load_page(page_idx)
                    try:
                        page.apply_redactions(images=1, graphics=1, text=1)
                    except Exception as pe:
                        logger.warning(f"Page-level redaction apply failed on page {page_idx+1}: {str(pe)}")
            except Exception as e:
                logger.warning(f"Failed applying redactions: {str(e)}")

            # Ensure watermark is applied on every page AFTER redactions
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
            if rects:
                logger.debug(
                    "Page {}: selection {} -> {} rect(s): {}",
                    page.number + 1,
                    selection,
                    len(rects),
                    [(float(r.x0), float(r.y0), float(r.x1), float(r.y1)) for r in rects]
                )
            else:
                logger.debug("Page {}: selection {} produced no rects", page.number + 1, selection)
            selection_rects.extend(rects)

        # Debug: outline selection rects to verify mapping
        try:
            for sr in selection_rects:
                page.draw_rect(sr, color=(0, 1, 0), width=0.8, fill=None)
        except Exception as e:
            logger.warning(f"Failed to draw selection outlines on page {page.number+1}: {str(e)}")

        # Add redaction annotations for each selection area
        for rect in selection_rects:
            try:
                page.add_redact_annot(rect, fill=self._redaction_fill)
                redaction_count += 1
            except Exception as e:
                logger.warning(f"Failed to add redaction annot on page {page.number+1}: {str(e)}")

        # Redactions are applied at the document level in redact_document
        return redaction_count
    
    def _selection_to_rects(self, selection: Dict[str, Any], page_rect: pymupdf.Rect) -> list[pymupdf.Rect]:
        rects: list[pymupdf.Rect] = []
        try:
            x = float(selection['x'])
            y = float(selection['y'])
            width = float(selection['width'])
            height = float(selection['height'])
            
            # Determine if coordinates are normalized (0..1), percent (0..100), or absolute (points)
            normalized_unit = 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 < width <= 1.0 and 0.0 < height <= 1.0
            percent_unit = 0.0 <= x <= 100.0 and 0.0 <= y <= 100.0 and 0.0 < width <= 100.0 and 0.0 < height <= 100.0 and not normalized_unit
            page_width = page_rect.width
            page_height = page_rect.height

            candidates: list[tuple[float,float,float,float]] = []
            if normalized_unit or percent_unit:
                if percent_unit:
                    # Convert to normalized 0..1 first
                    x_n = x / 100.0
                    y_n = y / 100.0
                    w_n = width / 100.0
                    h_n = height / 100.0
                else:
                    x_n, y_n, w_n, h_n = x, y, width, height
                # Assume browser-style coordinates: origin at top-left, y grows downward
                x0 = x_n * page_width
                y0 = y_n * page_height
                x1 = x0 + (w_n * page_width)
                y1 = y0 + (h_n * page_height)
                candidates.append((x0, y0, x1, y1))
            else:
                candidates.append((x, y, x + width, y + height))

            # Normalize, clamp and convert to Rects
            for (x0, y0, x1, y1) in candidates:
                orig = (x0, y0, x1, y1)
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
                    try:
                        logger.debug("Candidate {} -> clamped rect {}", orig, (float(r.x0), float(r.y0), float(r.x1), float(r.y1)))
                    except Exception:
                        pass
            
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
