from pydantic import BaseModel, UUID4


class AiApplyRequest(BaseModel):
    document_id: UUID4


class AiApplyProjectRequest(BaseModel):
    project_id: UUID4

