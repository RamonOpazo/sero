from pydantic import BaseModel, UUID4


class AiApplyRequest(BaseModel):
    document_id: UUID4
    # Optional encrypted password to decrypt original PDF for text extraction
    key_id: str | None = None
    encrypted_password: str | None = None


class AiApplyProjectRequest(BaseModel):
    project_id: UUID4
    # Optional encrypted password used to decrypt each document's original PDF
    key_id: str | None = None
    encrypted_password: str | None = None

