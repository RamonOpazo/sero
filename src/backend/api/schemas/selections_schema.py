from pydantic import BaseModel, UUID4, AwareDatetime, Field, ConfigDict
from backend.api.enums import ScopeType, CommitState


class SelectionCommitRequest(BaseModel):
    selection_ids: list[UUID4] | None = Field(default=None)
    commit_all: bool = Field(default=False)


class SelectionClearRequest(BaseModel):
    selection_ids: list[UUID4] | None = Field(default=None)
    clear_all: bool = Field(default=False)


class SelectionUncommitRequest(BaseModel):
    selection_ids: list[UUID4] | None = Field(default=None)
    uncommit_all: bool = Field(default=False)


class Selection(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    scope: ScopeType
    state: CommitState
    page_number: int | None
    x: float
    y: float
    width: float
    height: float
    confidence: float | None
    document_id: UUID4
    is_ai_generated: bool
    is_global_page: bool
    is_staged: bool

    model_config = ConfigDict(from_attributes=True)


class SelectionCreate(BaseModel):
    id: UUID4 | None = Field(None)
    scope: ScopeType = Field(default=ScopeType.DOCUMENT)
    state: CommitState = Field(default=CommitState.STAGED_CREATION)
    page_number: int | None = Field(None)  # no page number applies selection to whole document
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    width: float = Field(..., ge=0, le=1)
    height: float = Field(..., ge=0, le=1)
    confidence: float | None = Field(None, ge=0, le=1)
    document_id: UUID4


class SelectionUpdate(BaseModel):
    scope: ScopeType | None = Field(None)
    state: CommitState | None = Field(None)
    page_number: int | None = Field(None)
    x: float | None = Field(None, ge=0, le=1)
    y: float | None = Field(None, ge=0, le=1)
    width: float | None = Field(None, ge=0, le=1)
    height: float | None = Field(None, ge=0, le=1)
    confidence: float | None = Field(None, ge=0, le=1)
