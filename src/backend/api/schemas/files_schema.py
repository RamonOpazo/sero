import base64
from typing import Annotated
from pydantic import BaseModel, UUID4, AwareDatetime, Field, field_serializer, BeforeValidator, computed_field
from fastapi import UploadFile

from backend.api.schemas.selections_schema import Selection
from backend.api.schemas.prompts_schema import Prompt


class File(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    filename: str
    mime_type: str
    data: bytes
    size: int  # instead of data, which can be really huge
    salt: bytes
    file_hash: str
    is_original_file: bool
    document_id: UUID4
    prompts: Annotated[list[Prompt], BeforeValidator(lambda x: [] if x is None else x)]
    selections: Annotated[list[Selection], BeforeValidator(lambda x: [] if x is None else x)]

    @computed_field
    @property
    def prompt_count(self) -> int:
        return len(self.prompts)
    
    @computed_field
    @property
    def selection_count(self) -> int:
        return len(self.selections)

    @field_serializer("data")
    def serialize_data(self, value: bytes, _info):
        return f"{value[:min(8, len(value))]}..."

    @field_serializer("salt")
    def serialize_salt(self, value: bytes, _info):
        return base64.b64encode(value)
    
    class Config:
        from_attributes = True


class FileCreate(BaseModel):
    filename: str | None = Field(None)
    mime_type: str
    data: bytes
    is_original_file: bool
    salt: bytes
    file_hash: str
    document_id: UUID4


class FileUpdate(BaseModel):
    filename: str | None = Field(None)


class FileUpload(BaseModel):
    project_id: UUID4
    file: UploadFile
    description: str | None = Field(None)
