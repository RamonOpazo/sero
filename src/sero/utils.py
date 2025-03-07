import toml
from typing import Any
from pathlib import Path
from pydantic import validate_call

from sero import types, consts


@validate_call
def html_or_hex_to_rgb_float(color: types.HtmlColor) -> types.RGBFloatColor:
    
    def _enforce_hex(color: types.HtmlColor) -> types.HexColor:
        # Convert named colors to hex
        if isinstance(color, types.NamedColor):
            return consts.HTML_COLOR_NAMES[color]

        # Expand shorthand hex (e.g., #rgb → #rrggbb)
        if isinstance(color, types.HexColor) and len(color) == {4}:
            return "#" + "".join(c * 2 for c in color[1:])

        # In any other case, pydantic guarantees a correct hex color
        return color
    
    # Convert color to hex
    _color = _enforce_hex(color)

    # Convert hex to float RGB
    r, g, b = int(_color[1:3], 16), int(_color[3:5], 16), int(_color[5:7], 16)
    return (r/255.0, g/255.0, b/255.0)



