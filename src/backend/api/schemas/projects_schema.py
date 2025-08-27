import base64
from typing import Annotated
from pydantic import BaseModel, Field, field_validator, field_serializer, UUID4, AwareDatetime, BeforeValidator, computed_field, ConfigDict

from backend.core.security import security_manager
from backend.api.schemas.documents_schema import Document
from backend.api.schemas.templates_schema import Template
from backend.api.schemas.settings_schema import AiSettings, WatermarkSettings, AnnotationSettings
from backend.api.enums import ProjectStatus


class Project(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    name: str = Field(max_length=100,)
    description: str | None
    contact_name: str = Field(max_length=100,)
    contact_email: str = Field(max_length=100,)
    password_hash: bytes
    documents: Annotated[list[Document], BeforeValidator(lambda x: [] if x is None else x)]
    ai_settings: AiSettings | None = Field(None)
    watermark_settings: WatermarkSettings | None = Field(None)
    annotation_settings: AnnotationSettings | None = Field(None)
    template: Template | None = Field(None)

    @computed_field
    @property
    def document_count(self) -> int:
        return len(self.documents)
    
    @computed_field
    @property
    def status(self) -> ProjectStatus:
        if self.document_count == 0:
            return ProjectStatus.AWAITING
        # Add your custom logic here for determining status
        return ProjectStatus.IN_PROGRESS

    @field_serializer("password_hash")
    def serialize_password_hash(self, value: bytes, _info):
        return base64.b64encode(value).decode("utf-8")

    model_config = ConfigDict(from_attributes=True)

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    contact_name: str = Field(..., min_length=1, max_length=100)
    contact_email: str = Field(..., min_length=1, max_length=100)
    key_id: str = Field(..., min_length=1)
    encrypted_password: str = Field(..., min_length=1)


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=500)
    contact_name: str | None = Field(None, min_length=1, max_length=100)
    contact_email: str | None = Field(None, min_length=1, max_length=100)


class ProjectShallow(BaseModel):
    """Shallow project schema without nested document data for efficient listing."""
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    name: str = Field(max_length=100,)
    description: str | None
    contact_name: str = Field(max_length=100,)
    contact_email: str = Field(max_length=100,)
    
    # Metadata about next level without loading full data
    document_count: int
    has_documents: bool
    has_template: bool
    
    model_config = ConfigDict(from_attributes=True)


class ProjectSummary(BaseModel):
    """Comprehensive summary of a project including all documents and processing analytics."""
    project_id: UUID4
    name: str = Field(max_length=100,)
    description: str | None
    contact_name: str = Field(max_length=100,)
    contact_email: str = Field(max_length=100,)
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    status: ProjectStatus

    # Settings
    ai_settings: AiSettings | None = Field(None)
    watermark_settings: WatermarkSettings | None = Field(None)
    annotation_settings: AnnotationSettings | None = Field(None)
    
    # Document statistics
    has_template: bool
    document_count: int
    documents_with_original_files: int
    documents_with_redacted_files: int
    processed_documents_count: int
    
    # File statistics
    total_original_files_size: int
    total_redacted_files_size: int
    total_files_size: int
    
    # Processing components statistics
    total_prompts: int
    total_selections: int
    
    # Document processing timeline
    oldest_document_date: AwareDatetime | None
    newest_document_date: AwareDatetime | None
    
    model_config = ConfigDict(from_attributes=True)
