from __future__ import annotations
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.core.database import get_db_session
from src.service.ai_service import get_ai_service, GenerateSelectionsRequest, GenerateSelectionsResponse
from src.api.schemas import ai_schema
from src.api.controllers import ai_controller


router = APIRouter()

@router.get("/health")
async def ai_health() -> dict[str, bool]:
    svc = get_ai_service()
    # OllamaAiService implements health()
    try:
        ok = await svc.health()  # type: ignore[attr-defined]
    except Exception:
        ok = False
    return {"ok": bool(ok)}

@router.get("/catalog")
async def ai_catalog() -> dict:
    """Return available AI providers and their models for selection UIs."""
    svc = get_ai_service()
    try:
        catalog = await svc.catalog()
        return catalog.model_dump()
    except Exception:
        # Fallback to empty catalog
        return {"providers": []}

@router.post("/introspect")
async def ai_introspect(payload: GenerateSelectionsRequest) -> list[dict]:
    """Generate AI-driven selections for a document.
    Returns a plain list of selections to match current frontend expectations.
    """
    svc = get_ai_service()
    result: GenerateSelectionsResponse = await svc.generate_selections(payload)
    # Return a raw list for frontend convenience
    return [s.model_dump() for s in result.selections]

@router.post("/apply", response_model=dict)
async def ai_apply(payload: ai_schema.AiApplyRequest, db: Session = Depends(get_db_session)):
    """Apply AI for a document: generate and stage selections; return telemetry and staged selections."""
    res = await ai_controller.apply(db=db, request=payload)
    return res.model_dump()

@router.post("/apply/stream")
async def ai_apply_stream(payload: ai_schema.AiApplyRequest, db: Session = Depends(get_db_session)) -> StreamingResponse:
    """SSE endpoint streaming live telemetry for AI apply."""
    return await ai_controller.apply_stream(db=db, request=payload)


@router.post("/apply/project/stream")
async def ai_apply_project_stream(payload: ai_schema.AiApplyProjectRequest, db: Session = Depends(get_db_session)) -> StreamingResponse:
    """SSE endpoint streaming live telemetry for project-wise AI apply."""
    return await ai_controller.apply_project_stream(db=db, request=payload)
