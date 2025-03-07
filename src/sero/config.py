from __future__ import annotations

from pathlib import Path
from pydantic import BaseModel, DirectoryPath, FilePath
from pydantic_settings import BaseSettings, SettingsConfigDict

from sero import types, consts


class _ProjectContact(BaseModel):
    name: str
    email: str


class _Project(BaseModel):
    name: str
    version: str
    description: str
    contact: _ProjectContact


class _Paths(BaseModel):
    sourcedir: DirectoryPath
    outdir: DirectoryPath
    dbfile: FilePath


class _CropAnchor(BaseModel):
    border: types.AnchorBorder
    gap: int


class _IdMaker(BaseModel):
    header: str
    position: tuple[int, int]
    size: int
    color: types.HtmlColor    


class Settings(BaseSettings):
    project: _Project = None
    paths: _Paths = None
    crop_anchor: _CropAnchor = None
    id_marker: _IdMaker = None


def load_settings(configfile: Path) -> Settings:
    if not configfile.exists():
        raise FileExistsError("Sero configuration file not found! This command requires to run inside a project folder")
    
    model_config = SettingsConfigDict(toml_file=Path(configfile))
    _cls = Settings(model_config=model_config)
    return _cls
