from pydantic import BaseModel, UUID4, AwareDatetime, Field, computed_field


class Selection(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    page_number: int | None
    x: float
    y: float
    width: float
    height: float
    confidence: float | None
    document_id: UUID4

    @computed_field
    @property
    def is_ai_generated(self) -> bool:
        return self.confidence is not None

    class Config:
        from_attributes = True


class SelectionCreate(BaseModel):
    id : UUID4 | None = Field(None)
    page_number: int | None = Field(None)  # no page number applies selection to whole document
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    width: float = Field(..., ge=0, le=1)
    height: float = Field(..., ge=0, le=1)
    confidence: float | None = Field(None, ge=0, le=1)
    document_id: UUID4


class SelectionUpdate(BaseModel):
    page_number: int | None = Field(None)
    x: float | None = Field(None, ge=0, le=1)
    y: float | None = Field(None, ge=0, le=1)
    width: float | None = Field(None, ge=0, le=1)
    height: float | None = Field(None, ge=0, le=1)
    confidence: float | None = Field(None, ge=0, le=1)
