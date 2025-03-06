from typing import Annotated, Literal
from pydantic import confloat, conint, constr

from sero import consts, defaults


type AnchorBorder = Literal[*defaults.ANCHOR_BORDER_CHOICES]  # pyright: ignore
type AnchorGap = Annotated[int, conint(ge=0)]
type HexColor = Annotated[str, constr(strip_whitespace=True, to_lower=True, pattern=r"^#[a-f0-9]{3,6}$")]
type NamedColor = Literal[*consts.HTML_COLOR_NAMES.keys()]  # pyright: ignore
type HtmlColor = HexColor | NamedColor
type ColorChannel = Annotated[float, confloat(ge=0, le=1)]
type RGBFloatColor = tuple[ColorChannel, ColorChannel, ColorChannel]
type RetrieveType = Literal[*defaults.RETRIEVE_TYPE_CHOICES]  # pyright: ignore
type TestType = Literal[*defaults.TEST_TYPE_CHOICES]  # pyright: ignore