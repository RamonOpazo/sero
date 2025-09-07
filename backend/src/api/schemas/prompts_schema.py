from pydantic import BaseModel, UUID4, AwareDatetime, Field, ConfigDict

from src.api.enums import ScopeType, CommitState


class Prompt(BaseModel):
    id: UUID4
    created_at: AwareDatetime
    updated_at: AwareDatetime | None
    scope: ScopeType
    state: CommitState
    title: str = Field(max_length=150,)
    prompt: str
    directive: str = Field(max_length=50,)
    document_id: UUID4
    is_staged: bool

    model_config = ConfigDict(from_attributes=True)


class PromptCreate(BaseModel):
    id: UUID4 | None = Field(None)
    scope: ScopeType = Field(default=ScopeType.DOCUMENT)
    state: CommitState = Field(default=CommitState.STAGED_CREATION)
    title: str = Field(max_length=150,)
    prompt: str
    directive: str = Field(max_length=50,)
    document_id: UUID4


class PromptUpdate(BaseModel):
    scope: ScopeType | None = Field(None)
    state: CommitState | None = Field(None)
    title: str | None = Field(None, max_length=150,)
    prompt: str | None = Field(None)
    directive: str | None = Field(None, max_length=50,)
