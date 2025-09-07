from pydantic import BaseModel, Field, UUID4, AwareDatetime


class TemplateCreate(BaseModel):
    project_id: UUID4
    document_id: UUID4


class TemplateUpdate(BaseModel):
    project_id: UUID4 | None = Field(None)
    document_id: UUID4 | None = Field(None)


class Template(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None = None
    project_id: UUID4
    document_id: UUID4

    class Config:
        from_attributes = True
