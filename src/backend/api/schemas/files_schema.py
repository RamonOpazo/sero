import base64
from pydantic import BaseModel, UUID4, AwareDatetime, Field, field_serializer
from fastapi import UploadFile

from backend.api.enums import FileType


class File(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    file_hash: str
    file_type: FileType
    file_size: int
    mime_type: str
    data: bytes
    salt: bytes | None
    document_id: UUID4

    @field_serializer("data")
    def serialize_data(self, value: bytes, _info):
        return f"{value[:min(8, len(value))]}..."

    @field_serializer("salt")
    def serialize_salt(self, value: bytes | None, _info):
        return base64.b64encode(value) if value is not None else None
    
    class Config:
        from_attributes = True


class FileCreate(BaseModel):
    file_hash: str = Field(..., max_length=64)
    file_type: FileType
    mime_type: str = Field(..., max_length=100)
    data: bytes
    salt: bytes | None
    document_id: UUID4 | None


class FileUpdate(BaseModel):
    file_hash: str | None = Field(None, max_length=64)
    file_type: FileType | None = Field(None)
    mime_type: str | None = Field(None, max_length=100)
    data: bytes | None = Field(None)
    salt: bytes | None = Field(None)
    document_id: UUID4 | None = Field(None)


class FileUpload(BaseModel):
    project_id: UUID4
    file: UploadFile
    description: str | None = Field(None)
