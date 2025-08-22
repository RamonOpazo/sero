from pydantic import BaseModel, UUID4, AwareDatetime, Field


class Prompt(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    title: str
    prompt: str
    directive: str
    enabled: bool
    document_id: UUID4

    class Config:
        from_attributes = True


class PromptCreate(BaseModel):
    id : UUID4 | None = Field(None)
    title: str
    prompt: str
    directive: str
    enabled: bool = Field(default=True)
    document_id: UUID4


class PromptUpdate(BaseModel):
    title: str | None = Field(None)
    prompt: str | None = Field(None)
    directive: str | None = Field(None)
    enabled: bool | None = Field(None)
