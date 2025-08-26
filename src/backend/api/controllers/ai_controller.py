from __future__ import annotations
from uuid import UUID
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
from loguru import logger

from backend.api.schemas import documents_schema, ai_schema, selections_schema
from backend.core.config import settings as app_settings
from backend.core.ai_ollama import OllamaClient, OllamaOptions
from backend.core.prompt_composer import compose_selection_instructions
from backend.core.geometry import NormRect, merge_rects
from backend.api.enums import CommitState
from backend.api.schemas.selections_schema import SelectionCreate
from backend.crud import support_crud, documents_crud, selections_crud
from backend.service.text_extractor_service import get_text_extractor_service

# Canonical stage ordering for progress semantics
STAGES: list[str] = [
    "start",           # 0
    "compose_prompt",  # 1
    "request_sent",    # 2 (aka load_model+send)
    "generating",      # 3 (implied during tokens stream)
    "parsing",         # 4
    "merging",         # 5
    "filtering",       # 6
    "staging",         # 7
    "done",            # 8
]
STAGE_TOTAL = len(STAGES)


def stage_index(name: str) -> int:
    try:
        return STAGES.index(name)
    except ValueError:
        return 0


def stage_percent(name: str, *, token_chars: int = 0, staging_created: int = 0, staging_total: int = 0) -> float:
    # Coarse mapping with ranges for generating and staging
    idx = stage_index(name)
    # Base anchors for each stage index
    anchors = {
        0: 2.0,   # start
        1: 8.0,   # compose_prompt
        2: 20.0,  # request_sent (and loading model)
        3: 60.0,  # generating upper bound; we interpolate up to 60
        4: 70.0,  # parsing
        5: 80.0,  # merging
        6: 85.0,  # filtering
        7: 95.0,  # staging upper bound; interpolate to 95
        8: 100.0, # done
    }
    if idx == 3:
        # generating: scale with token_chars heuristic, capped
        # Assume first meaningful tokens appear by ~30% and saturate by 60%
        base = 30.0
        inc = min(30.0, float(token_chars) / 10.0)  # 10 chars ~ 1%
        return min(anchors[3], base + inc)
    if idx == 7 and staging_total > 0:
        # staging: interpolate from 85% to 95%
        base = 85.0
        frac = max(0.0, min(1.0, staging_created / max(1.0, float(staging_total))))
        return min(95.0, base + 10.0 * frac)
    return anchors.get(idx, 0.0)


async def apply(db: Session, request: ai_schema.AiApplyRequest) -> documents_schema.AiApplyResponse:
    """Apply AI to generate and stage selections for the given document (non-stream)."""
    document_id = UUID(str(request.document_id))

    # Ensure document exists and load prompts/settings
    document = support_crud.apply_or_404(
        documents_crud.read,
        db=db,
        id=document_id,
        join_with=["prompts", "project.ai_settings"],
    )

    committed_prompts = [p for p in document.prompts if getattr(p, "state", None) == CommitState.COMMITTED]

    # Filter by minimum confidence threshold from defaults
    from backend.core import defaults as core_defaults
    min_conf = float(getattr(core_defaults, 'AI_MIN_CONFIDENCE', 0.0))

    if not committed_prompts:
        return documents_schema.AiApplyResponse(
            selections=[],
            telemetry=documents_schema.AiApplyTelemetry(
                min_confidence=float(min_conf),
                returned=0,
                filtered_out=0,
                staged=0,
            ),
        )

    composed_prompts: list[str] = []
    for p in committed_prompts:
        composed_prompts.append(f"Directive: {p.directive}\nTitle: {p.title}\n\nInstructions:\n{p.prompt}")

    # Optional: extract text context if encrypted password provided
    text_context: str | None = None
    if request.key_id and request.encrypted_password:
        try:
            _, _, decrypted_data = support_crud.get_original_file_data_or_400_401_404_500(
                db=db,
                document_or_id=document,
                encrypted_password_b64=request.encrypted_password,
                key_id=request.key_id,
                join_with=["files"],
            )
            text_context = get_text_extractor_service().extract_text(pdf_data=decrypted_data)
        except Exception:
            text_context = None

    from backend.service.ai_service import get_ai_service, GenerateSelectionsRequest, to_runtime_settings
    svc = get_ai_service()
    req = GenerateSelectionsRequest(
        document_id=str(document_id),
        system_prompt=(document.project.ai_settings.system_prompt if getattr(document, "project", None) and getattr(document.project, "ai_settings", None) else None),
        prompts=composed_prompts,
        ai_settings=to_runtime_settings(getattr(document.project, "ai_settings", None) if getattr(document, "project", None) else None),
        text_context=text_context,
    )
    res = await svc.generate_selections(req)

    # Filter and stage
    filtered = [s for s in res.selections if (float(s.confidence) if s.confidence is not None else 0.0) >= min_conf]

    created_models = []
    for sel in filtered:
        sel.document_id = document_id
        sel.state = CommitState.STAGED_CREATION
        created_models.append(selections_crud.create(db=db, data=sel))

    selections_out = [selections_schema.Selection.model_validate(i) for i in created_models]
    telemetry = {
        "min_confidence": float(min_conf),
        "returned": int(len(res.selections)),
        "filtered_out": int(len(res.selections) - len(filtered)),
        "staged": int(len(created_models)),
    }
    return documents_schema.AiApplyResponse(selections=selections_out, telemetry=documents_schema.AiApplyTelemetry(**telemetry))


async def apply_stream(db: Session, request: ai_schema.AiApplyRequest) -> StreamingResponse:
    """Stream live telemetry (SSE) while generating and staging AI selections.

    Events:
    - status: { stage, stage_index, stage_total, percent }
    - model: { name: string }
    - tokens: { chars: number }   (periodically during generation)
    - staging_progress: { created: number, total: number }
    - summary: { returned, filtered_out, staged, min_confidence }
    - completed: { ok: boolean, reason?: string }
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

            # start
            stg = "start"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg)})

            # Compose prompt
            stg = "compose_prompt"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg)})
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

            # Optional: extract text context if password provided
            text_context: str | None = None
            if request.key_id and request.encrypted_password:
                try:
                    _, _, decrypted_data = support_crud.get_original_file_data_or_400_401_404_500(
                        db=db,
                        document_or_id=doc,
                        encrypted_password_b64=request.encrypted_password,
                        key_id=request.key_id,
                        join_with=["files"],
                    )
                    text_context = get_text_extractor_service().extract_text(pdf_data=decrypted_data)
                except Exception:
                    text_context = None

            # Stream tokens (generating)
            stg = "request_sent"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg)})
            token_chars = 0
            raw_parts: list[str] = []
            try:
                streaming_prompt = final_prompt if not text_context else f"{final_prompt}\n\n---\n\nDocument context (page-indexed):\n{text_context}"
                async for delta in client.generate_stream(model=model_name, prompt=streaming_prompt, options=opts):
                    raw_parts.append(delta)
                    token_chars += len(delta)
                    # generating progress throttled
                    if token_chars % 64 == 0:
                        yield ev("status", {"stage": "generating", "stage_index": stage_index("generating"), "stage_total": STAGE_TOTAL, "percent": stage_percent("generating", token_chars=token_chars)})
                        yield ev("tokens", {"chars": token_chars})
            except Exception as e:
                yield ev("error", {"message": str(e)})
                return

            raw = "".join(raw_parts)
            stg = "parsing"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg)})

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

            stg = "merging"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg)})
            merged = merge_rects(rects)

            # Filter then stage
            from backend.core import defaults as core_defaults
            min_conf = float(getattr(core_defaults, 'AI_MIN_CONFIDENCE', 0.0))
            stg = "filtering"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg)})
            filtered = [r for r in merged if (float(r.confidence) if r.confidence is not None else 0.0) >= min_conf]

            stg = "staging"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg, staging_created=0, staging_total=len(filtered))})
            created = 0
            total = len(filtered)
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
                    yield ev("staging_progress", {"created": created, "total": total, "percent": stage_percent("staging", staging_created=created, staging_total=total)})
                except Exception:
                    continue

            yield ev("summary", {"returned": len(merged), "filtered_out": len(merged) - created, "staged": created, "min_confidence": min_conf})
            stg = "done"
            yield ev("status", {"stage": stg, "stage_index": stage_index(stg), "stage_total": STAGE_TOTAL, "percent": stage_percent(stg)})
            yield ev("completed", {"ok": True})
        except Exception as e:
            logger.exception("apply_stream failed")
            yield ev("error", {"message": str(e)})
            return

    return StreamingResponse(sse_gen(), media_type="text/event-stream")


async def apply_project_stream(db: Session, request: ai_schema.AiApplyProjectRequest) -> StreamingResponse:
    """Stream project-wise AI apply across all documents in a project.

    Project events:
    - project_init: { total_documents }
    - project_progress: { processed, total }
    - project_doc_start: { index, document_id }
    - project_doc_summary: { document_id, returned, filtered_out, staged, min_confidence }

    Document events mirror apply_stream with document_id context where useful.
    """
    project_id = UUID(str(request.project_id))

    async def sse_gen():
        def ev(event: str, data: dict) -> str:
            return f"event: {event}\ndata: {json.dumps(data)}\n\n"
        try:
            # Fetch documents for project
            docs = documents_crud.search(
                db=db,
                skip=0,
                limit=10_000,
                project_id=project_id,
                join_with=["prompts", "project.ai_settings"],
                order_by=[("created_at", "asc")],
            )
            total_docs = len(docs)
            yield ev("project_init", {"total_documents": total_docs})
            processed = 0

            for idx, doc in enumerate(docs, start=1):
                did = UUID(str(doc.id))
                yield ev("project_doc_start", {"index": idx, "document_id": str(did)})

                committed_prompts = [p for p in doc.prompts if getattr(p, "state", None) == CommitState.COMMITTED]
                if not committed_prompts:
                    yield ev("project_doc_summary", {"document_id": str(did), "returned": 0, "filtered_out": 0, "staged": 0, "min_confidence": 0.0})
                    processed += 1
                    yield ev("project_progress", {"processed": processed, "total": total_docs})
                    continue

                # Compose prompt
                rules: list[str] = []
                for p in committed_prompts:
                    rules.append(f"Directive: {p.directive}\nTitle: {p.title}\n\nInstructions:\n{p.prompt}")
                sys_prompt = (doc.project.ai_settings.system_prompt if getattr(doc, "project", None) and getattr(doc.project, "ai_settings", None) else None)
                final_prompt = compose_selection_instructions(system_prompt=sys_prompt, rules=rules)

                # Model init
                model_name = (doc.project.ai_settings.model_name if getattr(doc, "project", None) and getattr(doc.project, "ai_settings", None) else app_settings.ai.model)
                yield ev("model", {"name": model_name, "document_id": str(did)})
                client = OllamaClient(base_url=app_settings.ai.host, timeout=app_settings.ai.timeout)
                opts = OllamaOptions()

                # Optional: extract text context for each document if password provided
                text_context: str | None = None
                if request.key_id and request.encrypted_password:
                    try:
                        _, _, decrypted_data = support_crud.get_original_file_data_or_400_401_404_500(
                            db=db,
                            document_or_id=doc,
                            encrypted_password_b64=request.encrypted_password,
                            key_id=request.key_id,
                            join_with=["files"],
                        )
                        text_context = get_text_extractor_service().extract_text(pdf_data=decrypted_data)
                    except Exception:
                        text_context = None

                # generating
                yield ev("status", {"stage": "request_sent", "stage_index": stage_index("request_sent"), "stage_total": STAGE_TOTAL, "percent": stage_percent("request_sent"), "document_id": str(did)})
                token_chars = 0
                raw_parts: list[str] = []
                try:
                    streaming_prompt = final_prompt if not text_context else f"{final_prompt}\n\n---\n\nDocument context (page-indexed):\n{text_context}"
                    async for delta in client.generate_stream(model=model_name, prompt=streaming_prompt, options=opts):
                        raw_parts.append(delta)
                        token_chars += len(delta)
                        if token_chars % 64 == 0:
                            yield ev("status", {"stage": "generating", "stage_index": stage_index("generating"), "stage_total": STAGE_TOTAL, "percent": stage_percent("generating", token_chars=token_chars), "document_id": str(did)})
                            yield ev("tokens", {"chars": token_chars, "document_id": str(did)})
                except Exception as e:
                    yield ev("error", {"message": str(e), "document_id": str(did)})
                    continue

                raw = "".join(raw_parts)
                yield ev("status", {"stage": "parsing", "stage_index": stage_index("parsing"), "stage_total": STAGE_TOTAL, "percent": stage_percent("parsing"), "document_id": str(did)})

                # Parse
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

                # Rects
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

                yield ev("status", {"stage": "merging", "stage_index": stage_index("merging"), "stage_total": STAGE_TOTAL, "percent": stage_percent("merging"), "document_id": str(did)})
                merged = merge_rects(rects)

                from backend.core import defaults as core_defaults
                min_conf = float(getattr(core_defaults, 'AI_MIN_CONFIDENCE', 0.0))
                yield ev("status", {"stage": "filtering", "stage_index": stage_index("filtering"), "stage_total": STAGE_TOTAL, "percent": stage_percent("filtering"), "document_id": str(did)})
                filtered = [r for r in merged if (float(r.confidence) if r.confidence is not None else 0.0) >= min_conf]

                yield ev("status", {"stage": "staging", "stage_index": stage_index("staging"), "stage_total": STAGE_TOTAL, "percent": stage_percent("staging", staging_created=0, staging_total=len(filtered)), "document_id": str(did)})
                created = 0
                total = len(filtered)
                for r in filtered:
                    try:
                        _ = selections_crud.create(db=db, data=SelectionCreate(
                            page_number=r.page_number,
                            x=r.x,
                            y=r.y,
                            width=r.width,
                            height=r.height,
                            confidence=r.confidence,
                            document_id=did,
                        ))
                        created += 1
                        yield ev("staging_progress", {"created": created, "total": total, "percent": stage_percent("staging", staging_created=created, staging_total=total), "document_id": str(did)})
                    except Exception:
                        continue

                yield ev("project_doc_summary", {"document_id": str(did), "returned": len(merged), "filtered_out": len(merged) - created, "staged": created, "min_confidence": min_conf})
                processed += 1
                yield ev("project_progress", {"processed": processed, "total": total_docs})

            yield ev("completed", {"ok": True})
        except Exception as e:
            logger.exception("apply_project_stream failed")
            yield ev("error", {"message": str(e)})
            return

    return StreamingResponse(sse_gen(), media_type="text/event-stream")

