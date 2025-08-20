from typing import Annotated
from pydantic import BaseModel, Field, UUID4, AwareDatetime, BeforeValidator, computed_field

from backend.api.schemas.files_schema import File, FileCreate
from backend.api.schemas.prompts_schema import Prompt
from backend.api.schemas.selections_schema import Selection
from backend.api.enums import FileType


class Document(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    name: str
    description: str | None
    project_id: UUID4
    tags: list[str]
    files: Annotated[list["File"], BeforeValidator(lambda x: [] if x is None else x)]
    prompts: Annotated[list[Prompt], BeforeValidator(lambda x: [] if x is None else x)]
    selections: Annotated[list[Selection], BeforeValidator(lambda x: [] if x is None else x)]

    @computed_field
    @property
    def original_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.ORIGINAL), None)
    
    @computed_field
    @property
    def redacted_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.REDACTED), None)

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None)
    project_id: UUID4
    tags: list[str] = Field(default_factory=list)


class DocumentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None)
    tags: list[str] | None = Field(None)


class DocumentShallow(BaseModel):
    """Shallow document schema without nested file data for efficient listing.
    Includes prompt and selection counts and is_processed flag.
    """
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    name: str
    description: str | None
    project_id: UUID4
    tags: list[str]
    
    # Minimal metadata
    prompt_count: int
    selection_count: int
    is_processed: bool
    
    class Config:
        from_attributes = True


class DocumentSummary(BaseModel):
    """Summary of a document including all its components and processing status."""
    document_id: UUID4
    name: str
    description: str | None
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    
    # Project information
    project_name: str
    project_id: UUID4
    
    # File information
    has_original_file: bool
    has_redacted_file: bool
    original_file_size: int | None
    redacted_file_size: int | None
    total_file_size: int
    
    # Processing components counts
    prompt_count: int
    selection_count: int
    tag_count: int
    tags: list[str]  # List of tag labels
    
    # Processing status indicators
    is_processed: bool
    ai_selections_count: int  # Selections with confidence score (AI-generated)
    manual_selections_count: int  # Selections without confidence score (user-generated)
    
    # Prompt analysis
    prompt_languages: list[str]  # Unique languages from all prompts
    average_temperature: float | None  # Average temperature of all prompts
    
    class Config:
        from_attributes = True


class DocumentBulkUpload(BaseModel):
    document_data: DocumentCreate
    file_data: FileCreate