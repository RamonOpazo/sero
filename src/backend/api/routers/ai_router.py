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

