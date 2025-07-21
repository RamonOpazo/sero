from pydantic import BaseModel, Field, UUID4, AwareDatetime

from sero.api.enums import DocumentStatus
from sero.api.schemas.files_schema import File


class Document(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    description: str | None
    status: DocumentStatus
    project_id: UUID4
    original_file: File | None
    obfuscated_file: File | None

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    project_id: UUID4
    description: str | None = Field(None)
    status: DocumentStatus


class DocumentUpdate(BaseModel):
    description: str | None = Field(None)
    status: DocumentStatus | None = Field(None)

