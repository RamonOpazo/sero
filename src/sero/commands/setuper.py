import toml
from typing import Any
from pathlib import Path
from argparse import Namespace

from sero import types, consts
from sero.config import load_settings


class Setuper:
    def __init__(self, args: Namespace) -> None:
        self.configfile = Path(consts.PATH_TO_CONFIG)
        self.settings = load_settings(self.configfile)
        self.project_name: str | None = getattr(args, "project_name", None)
        self.project_description: str | None = getattr(args, "project_description", None)
        self.project_version: str | None = getattr(args, "project_version", None)
        self.contact_name: str | None = getattr(args, "contact_name", None)
        self.contact_email: str | None = getattr(args, "contact_email", None)
        self.sourcedir: Path | None = getattr(args, "sourcedir", None)
        self.outdir: Path | None = getattr(args, "outdir", None)
        self.dbfile: Path | None = getattr(args, "dbfile", None)
        self.anchor_border: types.AnchorBorder | None = getattr(args, "anchor_border", None)
        self.anchor_gap: int | None = getattr(args, "anchor_gap", None)
        self.id_marker_header: str | None = getattr(args, "id_marker_header", None)
        self.id_marker_position: tuple[int, int] | None = getattr(args, "id_marker_position", None)
        self.id_marker_size: int | None = getattr(args, "id_marker_size", None)
        self.id_marker_color: types.HtmlColor | None = getattr(args, "id_marker_color", None)

    @property
    def config(self) -> dict[str, Any]:
        return {
            "project": {
                "name": self.project_name or self.settings.project.name,
                "description": self.project_description or self.settings.project.description,
                "version": self.project_version or self.settings.project.version,
                "contact": {
                    "name": self.contact_name or self.settings.project.contact.name,
                    "email": self.contact_email or self.settings.project.contact.email
                }
            },
            "paths": {
                "sourcedir": self.sourcedir or self.settings.paths.sourcedir,
                "outdir": self.outdir or self.settings.paths.outdir,
                "dbfile": self.dbfile or self.settings.paths.dbfile
            },
            "crop_anchor": {
                "border": self.anchor_border or self.settings.crop_anchor.border,
                "gap": self.anchor_gap or self.settings.crop_anchor.gap
            },
            "id_marker": {
                "header": self.id_marker_header or self.settings.id_marker.header,
                "position": self.id_marker_position or self.settings.id_marker.position,
                "size": self.id_marker_size or self.settings.id_marker.size,
                "color": self.id_marker_color or self.settings.id_marker.color
            }
        }
    
    def _run(self) -> None:
        print("Updating configuration file...")
        with self.configfile.open("w") as fp:
            toml.dump(self.config, fp)


def make_config(args: Namespace) -> None:
    _cls = Setuper(args)
    _cls._run()
