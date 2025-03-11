from __future__ import annotations

import toml
from pathlib import Path
from pydantic_settings import BaseSettings

from sero import types


class _Project(BaseSettings):
    name: str
    version: str
    description: str
    contact: str 


class _Paths(BaseSettings):
    docsdir: Path
    outdir: Path
    dbfile: Path


class _Crop(BaseSettings):
    border: types.CropBorder
    gap: int


class _Marker(BaseSettings):
    header: str
    position: tuple[int, int]
    size: int
    color: types.HtmlColor    


class Settings(BaseSettings):
    project: _Project = None
    paths: _Paths = None
    crop: _Crop = None
    marker: _Marker = None


def load_settings(configfile: Path) -> Settings:
    if not configfile.exists():
        raise FileExistsError("Sero configuration file not found! This command requires to run inside a project folder")
    
    with configfile.open("r") as fp:
        data = toml.load(fp)
        _cls = Settings(**data)
        return _cls
