from __future__ import annotations

from typing import Annotated, Literal
from pydantic import confloat, conint, StringConstraints

from sero import consts


type CropBorder = Literal[*consts.CROP_BORDER_CHOICES]  # pyright: ignore
type CropGap = Annotated[int, conint(ge=0)]
type CropPages = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^(all|[0-9]+((,|:)[0-9]+)*)$")]
type HexColorShorthand = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^#[a-f0-9]{3}$")]
type HexColorFull = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^#[a-f0-9]{6}$")]
type HexColor = HexColorShorthand | HexColorFull
type NamedColor = Literal[*consts.HTML_COLOR_NAMES.keys()]  # pyright: ignore
type HtmlColor = HexColor | NamedColor
type ColorChannel = Annotated[float, confloat(ge=0, le=1)]
type RGBFloatColor = tuple[ColorChannel, ColorChannel, ColorChannel]
type RetrieveMode = Literal[*consts.RETRIEVE_MODE_CHOICES]  # pyright: ignore
type TestMode = Literal[*consts.TEST_MODE_CHOICES]  # pyright: ignore
