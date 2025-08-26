from __future__ import annotations
from uuid import UUID
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from backend.api.schemas import documents_schema, ai_schema
from backend.api.controllers import documents_controller
from backend.core.config import settings as app_settings
from backend.core.ai_ollama import OllamaClient, OllamaOptions
from backend.core.prompt_composer import compose_selection_instructions
from backend.core.geometry import NormRect, merge_rects
from backend.api.enums import CommitState
from backend.api.schemas.selections_schema import SelectionCreate
from backend.crud import support_crud, documents_crud, selections_crud


async def apply(db: Session, request: ai_schema.AiApplyRequest) -> documents_schema.AiApplyResponse:
    """Apply AI to generate and stage selections for the given document.
    Delegates to the documents controller to preserve staging semantics and telemetry.
    """
    return await documents_controller.apply_ai_and_stage_async(db=db, document_id=UUID(str(request.document_id)))


async def apply_stream(db: Session, request: ai_schema.AiApplyRequest) -> StreamingResponse:
    """Stream live telemetry (SSE) while generating and staging AI selections.

    Events:
    - status: { stage: 'start'|'request_sent'|'parsing'|'merging' }
    - model: { name: string }
    - tokens: { chars: number }   (periodically during generation)
    - summary: { returned, filtered_out, staged, min_confidence }
    - completed: { ok: boolean }
    - error: { message: string }
    """
    document_id = UUID(str(request.document_id))

    async def sse_gen():
        def ev(event: str, data: dict) -> str:
            return f"event: {event}\ndata: {json.dumps(data)}\n\n"
        try:
            # Load document with prompts & settings
            doc = support_crud.apply_or_404(
                documents_crud.read,
                db=db,
                id=document_id,
                join_with=["prompts", "project.ai_settings"],
            )
            committed_prompts = [p for p in doc.prompts if getattr(p, "state", None) == CommitState.COMMITTED]
            if not committed_prompts:
                yield ev("summary", {"returned": 0, "filtered_out": 0, "staged": 0, "min_confidence": 0.0})
                yield ev("completed", {"ok": True})
                return

            yield ev("status", {"stage": "start"})

            # Compose prompt
            rules: list[str] = []
            for p in committed_prompts:
                rules.append(f"Directive: {p.directive}\nTitle: {p.title}\n\nInstructions:\n{p.prompt}")
            sys_prompt = (doc.project.ai_settings.system_prompt if getattr(doc, "project", None) and getattr(doc.project, "ai_settings", None) else None)
            final_prompt = compose_selection_instructions(system_prompt=sys_prompt, rules=rules)

            # Prepare Ollama client and options
            model_name = (doc.project.ai_settings.model_name if getattr(doc, "project", None) and getattr(doc.project, "ai_settings", None) else app_settings.ai.model)
            yield ev("model", {"name": model_name})
            client = OllamaClient(base_url=app_settings.ai.host, timeout=app_settings.ai.timeout)
            opts = OllamaOptions()

            # Stream tokens
            yield ev("status", {"stage": "request_sent"})
            token_chars = 0
            raw_parts: list[str] = []
            try:
                async for delta in client.generate_stream(model=model_name, prompt=final_prompt, options=opts):
                    raw_parts.append(delta)
                    token_chars += len(delta)
                    # throttle updates
                    if token_chars % 64 == 0:
                        yield ev("tokens", {"chars": token_chars})
            except Exception as e:
                yield ev("error", {"message": str(e)})
                return

            raw = "".join(raw_parts)
            yield ev("status", {"stage": "parsing"})

            # Parse items
            items: list[dict] = []
            try:
                data = json.loads(raw)
                if isinstance(data, dict):
                    it = data.get("selections", [])
                    if isinstance(it, list):
                        items = it
                elif isinstance(data, list):
                    items = data
            except Exception:
                items = []

            # Build rects
            rects: list[NormRect] = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                if any(k not in item for k in ("x", "y", "width", "height")):
                    continue
                try:
                    rects.append(NormRect(
                        page_number=item.get("page_number"),
                        x=float(max(0.0, min(1.0, float(item.get("x", 0.0))))),
                        y=float(max(0.0, min(1.0, float(item.get("y", 0.0))))),
                        width=float(max(0.0, min(1.0, float(item.get("width", 0.0))))),
                        height=float(max(0.0, min(1.0, float(item.get("height", 0.0))))),
                        confidence=(float(item.get("confidence")) if item.get("confidence") is not None else None),
                    ))
                except Exception:
                    continue

            yield ev("status", {"stage": "merging"})
            merged = merge_rects(rects)

            # Stage filtered by min confidence
            from backend.core import defaults as core_defaults
            min_conf = float(getattr(core_defaults, 'AI_MIN_CONFIDENCE', 0.0))
            filtered = [r for r in merged if (float(r.confidence) if r.confidence is not None else 0.0) >= min_conf]
            created = 0
            for r in filtered:
                try:
                    _ = selections_crud.create(db=db, data=SelectionCreate(
                        page_number=r.page_number,
                        x=r.x,
                        y=r.y,
                        width=r.width,
                        height=r.height,
                        confidence=r.confidence,
                        document_id=document_id,
                    ))
                    created += 1
                except Exception:
                    continue

            yield ev("summary", {"returned": len(merged), "filtered_out": len(merged) - created, "staged": created, "min_confidence": min_conf})
            yield ev("completed", {"ok": True})
        except Exception as e:
            yield ev("error", {"message": str(e)})
            return

    return StreamingResponse(sse_gen(), media_type="text/event-stream")

