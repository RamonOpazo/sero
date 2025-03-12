import toml
from typing import Any
from pathlib import Path
from argparse import Namespace, ArgumentTypeError

from sero import types, defaults
from sero.config import load_settings, test_settings


class Setuper:
    def __init__(self, args: Namespace) -> None:
        if not any(v for k, v in vars(args).items() if k != "command"):
            raise ArgumentTypeError(f"The {args.command} command requires at least one option to be provided")
        
        self.configfile = Path(defaults.PATH_TO_CONFIGFILE)
        self.settings = load_settings(self.configfile)
        self.project_name: str | None = getattr(args, "project_name", None)
        self.project_description: str | None = getattr(args, "project_description", None)
        self.project_version: str | None = getattr(args, "project_version", None)
        _name: str | None = getattr(args, "contact_name", None)
        _email: str | None = getattr(args, "contact_email", None)
        self.contact = f"{_name} <{_email}>"
        self.docsdir: Path | None = getattr(args, "docsdir", None)
        self.outdir: Path | None = getattr(args, "outdir", None)
        self.dbfile: Path | None = getattr(args, "dbfile", None)
        self.crop_border: types.CropBorder | None = getattr(args, "crop_border", None)
        self.crop_gap: types.CropGap | None = getattr(args, "crop_gap", None)
        self.crop_pages: types.CropPages | None = getattr(args, "crop_pages", None)
        self.marker_header: str | None = getattr(args, "marker_header", None)
        self.marker_position: tuple[int, int] | None = getattr(args, "marker_position", None)
        self.marker_size: int | None = getattr(args, "marker_size", None)
        self.marker_color: types.HtmlColor | None = getattr(args, "marker_color", None)

    @property
    def config(self) -> dict[str, Any]:
        return {
            "project": {
                "name": self.project_name or self.settings.project.name,
                "description": self.project_description or self.settings.project.description,
                "version": self.project_version or self.settings.project.version,
                "contact": self.contact or self.settings.project.contact
            },
            "paths": {
                "docsdir": str(self.docsdir or self.settings.paths.docsdir),
                "outdir": str(self.outdir or self.settings.paths.outdir),
                "dbfile": str(self.dbfile or self.settings.paths.dbfile)
            },
            "crop": {
                "border": self.crop_border or self.settings.crop.border,
                "gap": self.crop_gap or self.settings.crop.gap,
                "pages": self.crop_pages or self.settings.crop.pages
            },
            "marker": {
                "header": self.marker_header or self.settings.marker.header,
                "position": self.marker_position or self.settings.marker.position,
                "size": self.marker_size or self.settings.marker.size,
                "color": self.marker_color or self.settings.marker.color
            }
        }
    
    def _run(self) -> None:
        print("Updating configuration file...")
        test_settings(self.config)
        
        with self.configfile.open("w") as fp:
            toml.dump(self.config, fp)
        
        print("Update successful!")


def make_config(args: Namespace) -> None:
    _cls = Setuper(args)
    _cls._run()
