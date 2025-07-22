from pydantic import BaseModel, UUID4, AwareDatetime, Field

from backend.api.enums import PromptLanguage


class Prompt(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    label: str | None
    text: str
    languages: list[PromptLanguage]
    temperature: float = Field(..., ge=0, le=1)
    file_id: UUID4

    class Config:
        from_attributes = True


class PromptCreate(BaseModel):
    label: str | None = Field(None)
    text: str
    languages: list[PromptLanguage]
    temperature: float = Field(..., ge=0, le=1)


class PromptUpdate(BaseModel):
    label: str | None = Field(None)
    text: str | None = Field(None)
    languages: list[PromptLanguage] | None = Field(None)
    temperature: float = Field(None, ge=0, le=1)
