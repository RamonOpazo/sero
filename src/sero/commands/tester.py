import re
import json
from argparse import Namespace
from pathlib import Path

from .cropper import Cropper
from sero import defaults, types
from sero.config import load_settings


class Tester:
    def __init__(self, args: Namespace) -> None:
        self.configfile = Path(defaults.PATH_TO_CONFIGFILE)
        self.settings = load_settings(self.configfile)
        self.filepath: Path = args.filepath
        self.mode: types.TestMode = args.mode
        self.crop_border: types.CropBorder = args.crop_border or self.settings.crop.border
        self.crop_gap: types.CropGap = args.crop_gap or self.settings.crop.gap
        self.crop_pages: types.CropPages = args.crop_pages or self.settings.crop.pages
        self.regex: str | None = getattr(args, "regex", None)

    @property
    def args(self) -> Namespace:
        return self._args
    
    @property
    def testfile(self) -> Path:
        return self.settings.paths.outdir / "crop_test.pdf"

    def _attempt_data_extraction(self) -> None:
        if self.regex is None:
            raise ValueError("Must provide a regular expression in order to attempt data extraction")
        
        cropper = Cropper.for_testing(filename=self.filepath, crop_border=self.crop_border, crop_gap=self.crop_gap, crop_pages=self.crop_pages)
        text: str = next(cropper._obfuscate_and_return(get_text=True))
        matches = re.finditer(pattern=self.regex, string=text)
        groups = { k: v for match in matches for k, v in match.groupdict().items() if v }
        print(json.dumps(groups))

    def _attempt_document_cropping(self) -> None:
        cropper = Cropper.for_testing(filename=self.filepath, crop_border=self.crop_border, crop_gap=self.crop_gap, crop_pages=self.crop_pages)
        doc: bytes = next(cropper._obfuscate_and_return(get_doc=True))

        with self.testfile.open("wb") as fp:
            fp.write(doc)

    def _run(self) -> None:
        if self.mode == "cropping":
            self._attempt_document_cropping()

        if self.mode == "extraction":
            self._attempt_data_extraction()


def make_test(args: Namespace) -> None:
    _cls = Tester(args)
    _cls._run()
