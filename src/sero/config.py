from __future__ import annotations

import toml
from typing import Any
from pathlib import Path
from pydantic_settings import BaseSettings

from sero import types, utils


class _Project(BaseSettings):
    name: str
    description: str
    version: str
    contact: str 


class _Paths(BaseSettings):
    docsdir: Path
    outdir: Path
    dbfile: Path


class _Crop(BaseSettings):
    border: types.CropBorder
    gap: types.CropGap
    pages: types.CropPages


class _Marker(BaseSettings):
    header: str
    position: tuple[int, int]
    size: int
    color: types.HtmlColor

    @property
    def rgb_color(self) -> types.RGBFloatColor:
        return utils.html_color_to_rgb(self.color)


class Settings(BaseSettings):
    project: _Project
    paths: _Paths
    crop: _Crop
    marker: _Marker


def load_settings(configfile: Path) -> Settings:
    if not configfile.exists():
        raise FileExistsError("Sero configuration file not found! This command requires to run inside a project folder")
    
    with configfile.open("r") as fp:
        data = toml.load(fp)
        _cls = Settings(**data)
        return _cls


def test_settings(config: dict[str, Any]) -> None:
    Settings(**config)
