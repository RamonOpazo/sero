from pydantic import BaseModel, UUID4, AwareDatetime, Field


class Selection(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    label: str | None
    page_number: int | None
    x: float
    y: float
    width: float
    height: float
    confidence: float | None
    is_ai_generated: bool
    file_id: UUID4

    class Config:
        from_attributes = True


class SelectionCreate(BaseModel):
    label: str | None = Field(None)
    page_number: int | None = Field(None)  # no page number applies selection to whole document
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    width: float = Field(..., ge=0, le=1)
    height: float = Field(..., ge=0, le=1)
    confidence: float | None = Field(None, ge=0, le=1)


class SelectionUpdate(BaseModel):
    label: str | None = Field(None)
    page_number: int | None = Field(None)
    x: float = Field(None, ge=0, le=1)
    y: float = Field(None, ge=0, le=1)
    width: float = Field(None, ge=0, le=1)
    height: float = Field(None, ge=0, le=1)
    confidence: float | None = Field(None, ge=0, le=1)
