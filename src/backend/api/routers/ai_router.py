from __future__ import annotations
from fastapi import APIRouter
from backend.service.ai_service import get_ai_service

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

