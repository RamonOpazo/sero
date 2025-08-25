from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Iterable

from backend.core.geometry import NormRect, Box, normalize_rect, merge_rects


class GeometryService(ABC):
    @abstractmethod
    def make_rect(
        self,
        *,
        x: float,
        y: float,
        width: float,
        height: float,
        page_number: int | None = None,
        confidence: float | None = None,
    ) -> NormRect:
        """Construct a normalized rectangle value object."""
        raise NotImplementedError

    @abstractmethod
    def normalize(self, *, x: float, y: float, width: float, height: float) -> Box:
        """Clamp and normalize a rectangle into Box coordinates."""
        raise NotImplementedError

    @abstractmethod
    def merge(self, rects: Iterable[NormRect]) -> list[NormRect]:
        """Merge overlapping/touching rectangles per page."""
        raise NotImplementedError


class CoreGeometryService(GeometryService):
    def make_rect(
        self,
        *,
        x: float,
        y: float,
        width: float,
        height: float,
        page_number: int | None = None,
        confidence: float | None = None,
    ) -> NormRect:
        return NormRect(
            x=x,
            y=y,
            width=width,
            height=height,
            page_number=page_number,
            confidence=confidence,
        )

    def normalize(self, *, x: float, y: float, width: float, height: float) -> Box:
        return normalize_rect(x, y, width, height)

    def merge(self, rects: Iterable[NormRect]) -> list[NormRect]:
        return merge_rects(rects)


_singleton: GeometryService | None = None


def get_geometry_service() -> GeometryService:
    global _singleton
    if _singleton is None:
        _singleton = CoreGeometryService()
    return _singleton

