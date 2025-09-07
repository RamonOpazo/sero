from typing import Annotated
from pydantic import BaseModel, Field, UUID4, AwareDatetime, BeforeValidator, computed_field, ConfigDict

from src.api.schemas.files_schema import File, FileCreate
from src.api.schemas.prompts_schema import Prompt
from src.api.schemas.selections_schema import Selection
from src.api.schemas.templates_schema import Template
from src.api.enums import FileType


class Document(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    name: str = Field(max_length=100,)
    description: str | None
    project_id: UUID4
    files: Annotated[list["File"], BeforeValidator(lambda x: [] if x is None else x)]
    prompts: Annotated[list[Prompt], BeforeValidator(lambda x: [] if x is None else x)]
    selections: Annotated[list[Selection], BeforeValidator(lambda x: [] if x is None else x)]
    template: Template | None

    @computed_field
    @property
    def original_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.ORIGINAL), None)
    
    @computed_field
    @property
    def redacted_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.REDACTED), None)

    model_config = ConfigDict(from_attributes=True)


class DocumentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None)
    project_id: UUID4


class DocumentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None)


class DocumentShallow(BaseModel):
    """Shallow document schema without nested file data for efficient listing."""
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    name: str = Field(max_length=100,)
    description: str | None
    project_id: UUID4
    
    # Minimal metadata
    prompt_count: int
    selection_count: int
    is_processed: bool
    is_template: bool
    
    model_config = ConfigDict(from_attributes=True)


class DocumentSummary(BaseModel):
    """Summary of a document including all its components and processing status."""
    document_id: UUID4
    name: str = Field(max_length=100,)
    description: str | None
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    
    # Project information
    project_name: str
    project_id: UUID4
    
    # Processing status indicators
    is_processed: bool
    is_template: bool
    
    # File information
    has_original_file: bool
    has_redacted_file: bool
    original_file_size: int | None
    redacted_file_size: int | None
    total_file_size: int
    
    # Processing components counts
    prompt_count: int
    selection_count: int
    ai_selections_count: int
    manual_selections_count: int
    
    model_config = ConfigDict(from_attributes=True)


class AiApplyTelemetry(BaseModel):
    min_confidence: float
    returned: int
    filtered_out: int
    staged: int


class AiApplyResponse(BaseModel):
    selections: list[Selection]
    telemetry: AiApplyTelemetry


class DocumentBulkUpload(BaseModel):
    document_data: DocumentCreate
    file_data: FileCreate
