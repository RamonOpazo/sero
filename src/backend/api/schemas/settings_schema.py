from pydantic import BaseModel, Field, UUID4, AwareDatetime, ConfigDict
from backend.api.enums import AnchorOption
import re

HEX_COLOR_REGEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


class AiSettingsCreate(BaseModel):
    provider: str = Field(..., max_length=50,)
    model_name: str = Field(..., max_length=100,)
    temperature: float = Field(ge=0.0, le=1.0,)
    top_p: float | None = Field(None, ge=0.0, le=1.0,)
    max_tokens: int | None = Field(None, gt=0,)
    num_ctx: int | None = Field(None, gt=0,)
    seed: int | None = Field(None,)
    stop_tokens: list[str] = Field(default_factory=list,)
    system_prompt: str | None = Field(None,)
    project_id: UUID4


class AiSettingsUpdate(BaseModel):
    provider: str | None = Field(None, max_length=50,)
    model_name: str | None = Field(None, max_length=100,)
    temperature: float | None = Field(None,)
    top_p: float | None = Field(None,)
    max_tokens: int | None = Field(None,)
    num_ctx: int | None = Field(None,)
    seed: int | None = Field(None,)
    stop_tokens: list[str] | None = Field(None,)
    system_prompt: str | None = Field(None,)


class AiSettings(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    provider: str = Field(max_length=50,)
    model_name: str = Field(max_length=100,)
    temperature: float = Field(ge=0.0, le=1.0,)
    top_p: float | None = Field(ge=0.0, le=1.0,)
    max_tokens: int | None = Field(gt=0,)
    num_ctx: int | None = Field(gt=0,)
    seed: int | None
    stop_tokens: list[str]
    system_prompt: str | None
    project_id: UUID4

    model_config = ConfigDict(from_attributes=True)


# Watermark Settings Schemas

class WatermarkSettingsCreate(BaseModel):
    anchor: AnchorOption
    padding: int = Field(ge=0,)
    bg_color: str | None = Field(None, max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    fg_color: str = Field(..., max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    text: str | None = Field(None, max_length=255,)
    text_size: int | None = Field(None, gt=0,)
    project_id: UUID4

class WatermarkSettingsUpdate(BaseModel):
    anchor: AnchorOption | None = Field(None,)
    padding: int | None = Field(None, ge=0,)
    bg_color: str | None = Field(None, max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    fg_color: str | None = Field(None, max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    text: str | None = Field(None, max_length=255,)
    text_size: int | None = Field(None, gt=0,)

class WatermarkSettings(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    anchor: AnchorOption
    padding: int = Field(ge=0,)
    bg_color: str | None
    fg_color: str
    text: str | None
    text_size: int | None = Field(gt=0,)
    project_id: UUID4

    model_config = ConfigDict(from_attributes=True)


# Annotation Settings Schemas

class AnnotationSettingsCreate(BaseModel):
    bg_color: str = Field(..., max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    fg_color: str | None = Field(None, max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    text: str | None = Field(None, max_length=255,)
    text_size: int | None = Field(gt=0,)
    project_id: UUID4

class AnnotationSettingsUpdate(BaseModel):
    bg_color: str | None = Field(None, max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    fg_color: str | None = Field(None, max_length=7, pattern=HEX_COLOR_REGEX.pattern,)
    text: str | None = Field(None, max_length=255,)
    text_size: int | None = Field(None,)

class AnnotationSettings(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    bg_color: str
    fg_color: str | None
    text: str | None
    text_size: int | None = Field(gt=0,)
    project_id: UUID4

    model_config = ConfigDict(from_attributes=True)
