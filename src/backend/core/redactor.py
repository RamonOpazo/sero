import pymupdf
from uuid import UUID, uuid4
from enum import Enum
from dataclasses import dataclass
from loguru import logger


class CropBorder(str, Enum):
    """Enumeration for crop border types."""
    TOP = "top"
    BOTTOM = "bottom"


class CropGap(float):
    """Type for crop gap measurements (in points)."""
    pass


@dataclass
class RedactionConfig:
    """Configuration for PDF redaction operations."""
    crop_border: CropBorder
    crop_gap: CropGap
    crop_pages: str | None = None  # Page ranges like "1-3,5,7-9"
    marker_text: str = "SERO REDACTED"
    marker_position: tuple[float, float] = (50, 50)  # x, y coordinates
    marker_fontsize: float = 12
    marker_color: tuple[float, float, float] = (1.0, 0.0, 0.0)  # RGB red


@dataclass
class RedactionResult:
    """Result of a PDF redaction operation."""
    redacted_pdf_data: bytes
    extracted_text: str
    redaction_uuid: UUID
    page_count: int
    redacted_areas_count: int


class PDFRedactionError(Exception):
    """Custom exception for PDF redaction errors."""
    pass


class PDFRedactor:
    """
    PDF Redaction Handler using PyMuPDF.
    
    This class provides functionality to redact sensitive information from PDF documents
    based on configurable crop areas and page ranges.
    """

    def __init__(self, config: RedactionConfig):
        """
        Initialize the PDF redactor with configuration.
        
        Args:
            config: RedactionConfig object containing redaction parameters
        """
        self.config = config
        self._crop_ranges: set[int] | None = None
        
        if config.crop_pages:
            self._crop_ranges = self._parse_page_ranges(config.crop_pages)

    def redact_pdf(self, pdf_data: bytes, filename: str = "document.pdf") -> RedactionResult:
        """
        Redact a PDF document based on the configured parameters.
        
        Args:
            pdf_data: Raw PDF data as bytes
            filename: Optional filename for logging/debugging purposes
            
        Returns:
            RedactionResult containing the redacted PDF and extracted text
            
        Raises:
            PDFRedactionError: If redaction fails
        """
        try:
            logger.info(f"Starting PDF redaction for {filename}")
            
            # Open PDF document from bytes
            doc = pymupdf.open("pdf", pdf_data)
            
            if doc.is_encrypted:
                raise PDFRedactionError("PDF is encrypted and cannot be processed")
            
            if doc.page_count == 0:
                raise PDFRedactionError("PDF contains no pages")
            
            # Generate unique identifier for this redaction
            redaction_uuid = uuid4()
            
            # Extract text from the first page before redaction
            extracted_text = self._extract_text_from_page(doc.load_page(0))
            
            # Track redaction statistics
            redacted_areas_count = 0
            
            # Process each page
            for page_num in range(doc.page_count):
                page = doc.load_page(page_num)
                page_index = page_num + 1  # 1-based indexing for user-friendly page numbers
                
                # Check if this page should be redacted
                if self._should_redact_page(page_index):
                    areas_redacted = self._redact_page(page)
                    redacted_areas_count += areas_redacted
                    self._insert_redaction_marker(page, redaction_uuid)
                    logger.debug(f"Redacted {areas_redacted} areas on page {page_index}")
            
            # Get the redacted PDF as bytes and page count before closing
            redacted_pdf_data = doc.write()
            final_page_count = doc.page_count
            doc.close()
            
            result = RedactionResult(
                redacted_pdf_data=redacted_pdf_data,
                extracted_text=extracted_text,
                redaction_uuid=redaction_uuid,
                page_count=final_page_count,
                redacted_areas_count=redacted_areas_count
            )
            
            logger.info(f"PDF redaction completed for {filename}. "
                       f"UUID: {redaction_uuid}, "
                       f"Pages: {final_page_count}, "
                       f"Redacted areas: {redacted_areas_count}")
            
            return result
            
        except PDFRedactionError:
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            # Handle PyMuPDF specific errors and unexpected errors
            error_msg = str(e)
            logger.error(f"Unexpected error during PDF redaction: {error_msg}")
            
            if "format" in error_msg.lower() or "invalid" in error_msg.lower():
                raise PDFRedactionError(f"Invalid PDF format: {error_msg}")
            elif any(keyword in error_msg.lower() for keyword in ["pymupdf", "mupdf", "fitz"]):
                raise PDFRedactionError(f"PyMuPDF error: {error_msg}")
            else:
                raise PDFRedactionError(f"PDF redaction failed: {error_msg}")

    def _extract_text_from_page(self, page: pymupdf.Page) -> str:
        """
        Extract text from areas that will be redacted.
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            Extracted text from redaction areas
        """
        try:
            # Get all text rectangles from the page
            text_rects = self._extract_text_rectangles(page)
            
            # Extract text from rectangles that fall within the crop area
            cropped_texts = []
            for rect in text_rects:
                if self._is_rect_in_crop_area(rect):
                    text = page.get_text("text", clip=rect)
                    if text.strip():  # Only add non-empty text
                        cropped_texts.append(text.strip())
            
            return "\n".join(cropped_texts)
            
        except Exception as e:
            logger.warning(f"Failed to extract text from page: {str(e)}")
            return ""

    def _extract_text_rectangles(self, page: pymupdf.Page) -> list[pymupdf.Rect]:
        """
        Extract all text rectangles from a page.
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            List of text rectangles
        """
        try:
            # Get text in textbox format and search for each line
            textbox_content = page.get_textbox(page.rect)
            text_lines = textbox_content.split("\n")
            
            rectangles = []
            for line in text_lines:
                if line.strip():  # Skip empty lines
                    line_rects = page.search_for(line.strip())
                    rectangles.extend(line_rects)
            
            return rectangles
            
        except Exception as e:
            logger.warning(f"Failed to extract text rectangles: {str(e)}")
            return []

    def _is_rect_in_crop_area(self, rect: pymupdf.Rect) -> bool:
        """
        Check if a rectangle falls within the configured crop area.
        
        Args:
            rect: PyMuPDF rectangle object
            
        Returns:
            True if rectangle should be redacted
        """
        crop_border = self.config.crop_border
        crop_gap = self.config.crop_gap
        
        if crop_border == CropBorder.TOP:
            return rect.y0 <= crop_gap
        elif crop_border == CropBorder.BOTTOM:
            return rect.y1 >= crop_gap
        
        return False

    def _should_redact_page(self, page_number: int) -> bool:
        """
        Check if a page should be redacted based on crop_pages configuration.
        
        Args:
            page_number: 1-based page number
            
        Returns:
            True if page should be redacted
        """
        if self._crop_ranges is None:
            return True  # Redact all pages if no specific range is set
        
        return page_number in self._crop_ranges

    def _redact_page(self, page: pymupdf.Page) -> int:
        """
        Redact sensitive areas on a page.
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            Number of areas redacted
        """
        try:
            text_rects = self._extract_text_rectangles(page)
            redacted_count = 0
            
            for rect in text_rects:
                if self._is_rect_in_crop_area(rect):
                    # Add redaction annotation
                    page.add_redact_annot(rect)
                    redacted_count += 1
            
            # Apply all redactions on this page
            if redacted_count > 0:
                page.apply_redactions()
            
            return redacted_count
            
        except Exception as e:
            logger.error(f"Failed to redact page: {str(e)}")
            return 0

    def _insert_redaction_marker(self, page: pymupdf.Page, redaction_uuid: UUID) -> None:
        """
        Insert a redaction marker on the page.
        
        Args:
            page: PyMuPDF page object
            redaction_uuid: Unique identifier for this redaction
        """
        try:
            marker_text = f"{self.config.marker_text}: {redaction_uuid}"
            position = self.config.marker_position
            
            page.insert_text(
                position,
                marker_text,
                fontsize=self.config.marker_fontsize,
                color=self.config.marker_color
            )
            
        except Exception as e:
            logger.warning(f"Failed to insert redaction marker: {str(e)}")

    def _parse_page_ranges(self, page_ranges: str) -> set[int]:
        """
        Parse page range string into a set of page numbers.
        
        Args:
            page_ranges: String like "1-3,5,7-9" 
            
        Returns:
            Set of page numbers (1-based)
            
        Raises:
            PDFRedactionError: If page range format is invalid
        """
        try:
            pages = set()
            
            # Split by comma and process each part
            for part in page_ranges.split(','):
                part = part.strip()
                
                if '-' in part:
                    # Handle range like "1-3"
                    start, end = part.split('-', 1)
                    start_page = int(start.strip())
                    end_page = int(end.strip())
                    
                    if start_page > end_page:
                        raise ValueError(f"Invalid range: {part}")
                    
                    pages.update(range(start_page, end_page + 1))
                else:
                    # Handle single page
                    pages.add(int(part))
            
            return pages
            
        except ValueError as e:
            raise PDFRedactionError(f"Invalid page range format '{page_ranges}': {str(e)}")

    @staticmethod
    def create_default_config(
        crop_border: CropBorder = CropBorder.TOP,
        crop_gap: CropGap = 100.0,
        crop_pages: str | None = None
    ) -> RedactionConfig:
        """
        Create a default redaction configuration.
        
        Args:
            crop_border: Which border to crop from
            crop_gap: Gap distance in points
            crop_pages: Page ranges to redact
            
        Returns:
            RedactionConfig with default settings
        """
        return RedactionConfig(
            crop_border=crop_border,
            crop_gap=crop_gap,
            crop_pages=crop_pages
        )

    @staticmethod
    def validate_pdf_data(pdf_data: bytes) -> bool:
        """
        Validate that the provided data is a valid PDF.
        
        Args:
            pdf_data: Raw PDF data as bytes
            
        Returns:
            True if valid PDF, False otherwise
        """
        try:
            doc = pymupdf.open("pdf", pdf_data)
            is_valid = doc.page_count > 0 and not doc.needs_pass
            doc.close()
            return is_valid
        except Exception:
            return False


def create_pdf_redactor(
    crop_border: str = "top",
    crop_gap: float = 100.0,
    crop_pages: str | None = None
) -> PDFRedactor:
    """
    Factory function to create a PDF redactor with string parameters.
    
    Args:
        crop_border: "top" or "bottom"
        crop_gap: Gap distance in points
        crop_pages: Page ranges to redact (e.g., "1-3,5,7-9")
        
    Returns:
        Configured PDFRedactor instance
        
    Raises:
        ValueError: If parameters are invalid
    """
    try:
        border_enum = CropBorder(crop_border.lower())
    except ValueError:
        raise ValueError(f"Invalid crop_border '{crop_border}'. Must be 'top' or 'bottom'.")
    
    if crop_gap < 0:
        raise ValueError("crop_gap must be non-negative")
    
    config = RedactionConfig(
        crop_border=border_enum,
        crop_gap=CropGap(crop_gap),
        crop_pages=crop_pages
    )
    
    return PDFRedactor(config)
