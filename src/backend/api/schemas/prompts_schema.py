from pydantic import BaseModel, UUID4, AwareDatetime, Field


class Prompt(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    text: str
    languages: list[str]
    temperature: float
    document_id: UUID4

    class Config:
        from_attributes = True


class PromptCreate(BaseModel):
    id : UUID4 | None = Field(None)
    text: str
    languages: list[str]
    temperature: float = Field(..., ge=0, le=1)
    document_id: UUID4


class PromptUpdate(BaseModel):
    text: str | None = Field(None)
    languages: list[str] | None = Field(None)
    temperature: float | None = Field(None, ge=0, le=1)
