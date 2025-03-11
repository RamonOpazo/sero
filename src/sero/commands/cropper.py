import pymupdf
import base64
from getpass import getpass
from typing import Self, Iterator
from argparse import Namespace
from pathlib import Path
from uuid import UUID, uuid4
from alive_progress import alive_it

from sero import defaults, types, utils
from sero.config import load_settings
from sero.crud import save_document, save_unit, retrieve_manifest


class Cropper:
    def __init__(self, args: Namespace | None, **kwargs) -> None:
        self.configfile = Path(defaults.PATH_TO_CONFIGFILE)
        self.settings = load_settings(self.configfile)
        self.manifest = retrieve_manifest(self.settings.paths.dbfile)
        self.pattern: str = kwargs.get("pattern") or args.pattern
        self.crop_border: types.CropBorder | None = kwargs.get("crop_border") or getattr(args, "crop_border", None) or self.settings.crop.border
        self.crop_gap: int | None = kwargs.get("crop_gap") or getattr(args, "crop_gap", None) or self.settings.crop.gap
        self._password: str | None = None

    @classmethod
    def for_testing(cls, filename: Path, crop_border: types.CropBorder, crop_gap: int) -> Self:
        cropper = cls(args=None, pattern=filename.as_posix(), crop_border=crop_border, crop_gap=crop_gap)
        return cropper

    @property
    def pdf_files(self) -> list[Path]:
        files = Path().glob(pattern=self.pattern)

        if len(files) == 1:
            return files
        
        return alive_it(files)
    
    def _verify_password(self) -> None:
        if self.manifest.sec_hash is None:
            return

        while True:
            self._password = getpass("Enter the password: ")
            hashed_password = utils.hash_data(password=self._password, data=self._password)

            if utils.verify_hashed_data(password=self._password, data=hashed_password, stored_hash=self.manifest.sec_hash):
                print("Password confirmed successfully!")
                return

            print("\nIncorrect password! Please try again.")

    def _extract_rects(self, page: pymupdf.Page) -> list[pymupdf.Rect]:
        return list([ j for i in page.get_textbox(page.rect).split("\n") for j in page.search_for(i) ])
    
    def _extract_text(self, page: pymupdf.Page) -> str:
        page_rects = self._extract_rects(page)
        cropped_texts = [ page.get_text("text", clip=rect) for rect in page_rects if self._is_inside_cropped_area(rect) ]
        return "\n".join(cropped_texts)

    def _insert_id_marker(self, page: pymupdf.Page, uuid: UUID) -> None:
        header = f"{defaults.ID_MARKER_HEADER}: {uuid}"
        page.insert_text(defaults.ID_MARKER_POS, header, fontsize=defaults.ID_MARKER_SIZE, color=defaults.ID_MARKER_COLOR)
    
    def _is_inside_cropped_area(self, rect: pymupdf.Rect) -> bool:
        crop_border = self.crop_border or self.settings.crop.border
        crop_gap = self.crop_gap or self.settings.crop.gap

        return (
            (crop_border == "top" and rect.y0 <= crop_gap)
            or (crop_border == "bottom" and rect.y1 >= crop_gap)
        )

    def _process_doc(self, doc: pymupdf.Document) -> tuple[UUID, str]:
        uuid = uuid4()
        cropped_text = self._extract_text(doc.load_page(0))
        
        for page in doc:
            self._remove_text(page=page)
            self._insert_id_marker(page=page, uuid=uuid)

        return (uuid, cropped_text)

    def _remove_text(self, page: pymupdf.Page) -> None:
        page_rects = self._extract_rects(page)
        for rect in page_rects:
            if self._is_inside_cropped_area(rect):
                page.add_redact_annot(rect)
                page.apply_redactions()

    def _obfuscate(self) -> None:
        for fp in self.pdf_files:
            doc = pymupdf.open(fp)
            uuid, cropped_text = self._process_doc(doc)

            _text = base64.b64encode(bytes(cropped_text) if self._password else utils.encrypt_data(password=self._password, data=bytes(cropped_text)))
            _data = base64.b64encode(doc.write() if self._password else utils.encrypt_data(password=self._password, data=doc.write()))

            save_unit(dbfile=self.settings.paths.dbfile, unit_id=uuid, file_name=doc.name, cropped_text=_text)
            save_document(dbfile=self.settings.paths.dbfile, unit_id=uuid, data=_data)
        
    def _obfuscate_and_return(self, get_doc: bool = False, get_text: bool = False, get_uuid: bool = False) -> Iterator[bytes] | Iterator[str] | Iterator[UUID]:
        for fp in self.pdf_files:
            doc = pymupdf.open(fp)
            uuid, cropped_text = self._process_doc(doc)

            if get_doc:
                yield doc.write()

            if get_text:
                yield cropped_text

            if get_uuid:
                yield uuid

    def run(self) -> None:
        self._verify_password()
        self._obfuscate()

    
def make_obfuscation(args: Namespace) -> None:
    _cls = Cropper(args)
    _cls._run()
