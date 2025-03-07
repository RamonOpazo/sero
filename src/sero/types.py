from typing import Annotated, Literal
from pydantic import confloat, conint, constr

from sero import consts


type AnchorBorder = Literal[*consts.ANCHOR_BORDER_CHOICES]  # pyright: ignore
type AnchorGap = Annotated[int, conint(ge=0)]
type HexColor = Annotated[str, constr(strip_whitespace=True, to_lower=True, pattern=r"^#[a-f0-9]{3,6}$")]
type NamedColor = Literal[*consts.HTML_COLOR_NAMES.keys()]  # pyright: ignore
type HtmlColor = HexColor | NamedColor
type ColorChannel = Annotated[float, confloat(ge=0, le=1)]
type RGBFloatColor = tuple[ColorChannel, ColorChannel, ColorChannel]
type RetrieveAction = Literal[*consts.RETRIEVE_ACTION_CHOICES]  # pyright: ignore
type TestAction = Literal[*consts.TEST_ACTION_CHOICES]  # pyright: ignore