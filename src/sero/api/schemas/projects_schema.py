from typing import Annotated
from pydantic import BaseModel, Field, field_validator, UUID4, AwareDatetime, BeforeValidator

from sero.core.security import security_manager
from sero.api.schemas.documents_schema import Document


class Project(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    name: str
    description: str | None
    version: int
    contact_name: str
    contact_email: str
    password_hash: str
    documents: Annotated[list[Document], BeforeValidator(lambda x: [] if x is None else x)]

    @property
    def document_count(self) -> int:
        return len(self.documents)

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    version: int = Field(default=1)
    contact_name: str = Field(..., min_length=1, max_length=100)
    contact_email: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    
    @field_validator("password")
    def validate_password(cls, value: str):
        if not security_manager.is_strong_password(value):
            raise ValueError('Password must contain at least 8 characters with uppercase, lowercase, digits, and special characters')
        return value


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    version: int | None = Field(None)
    contact_name: str | None = Field(None, min_length=1, max_length=100)
    contact_email: str | None = Field(None, min_length=1, max_length=100)
