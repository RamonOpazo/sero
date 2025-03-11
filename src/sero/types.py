from typing import Annotated, Literal
from pydantic import confloat, conint, constr

from sero import consts


type CropBorder = Literal[*consts.CROP_BORDER_CHOICES]  # pyright: ignore
type CropGap = Annotated[int, conint(ge=0)]
type HexColor = Annotated[str, constr(strip_whitespace=True, to_lower=True, pattern=r"^#[a-f0-9]{3,6}$")]
type NamedColor = Literal[*consts.HTML_COLOR_NAMES.keys()]  # pyright: ignore
type HtmlColor = HexColor | NamedColor
type ColorChannel = Annotated[float, confloat(ge=0, le=1)]
type RGBFloatColor = tuple[ColorChannel, ColorChannel, ColorChannel]
type RetrieveMode = Literal[*consts.RETRIEVE_MODE_CHOICES]  # pyright: ignore
type TestMode = Literal[*consts.TEST_MODE_CHOICES]  # pyright: ignore
