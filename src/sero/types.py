from typing import Annotated, Literal
from pydantic import confloat, conint, constr

from sero import consts, defaults


type AnchorBorder = Literal[tuple(defaults.ANCHOR_BORDER_CHOICES)]  # pyright: ignore
type AnchorGap = Annotated[int, conint(ge=0)]
type HexColor = Annotated[str, constr(strip_whitespace=True, to_lower=True, pattern=r"^#[a-f0-9]{3,6}$")]
type NamedColor = Literal[tuple(consts.HTML_COLOR_NAMES.keys())]  # pyright: ignore
type HtmlColor = HexColor | NamedColor
type ColorChannel = Annotated[float, confloat(ge=0, le=1)]
type RGBFloatColor = tuple[ColorChannel, ColorChannel, ColorChannel]
type RetrieveType = Literal[tuple(defaults.RETRIEVE_TYPE_CHOICES)]  # pyright: ignore
