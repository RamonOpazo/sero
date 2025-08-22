# Sero AI Refactor Plan (Offline Ollama + Per-Document Settings)

Objective
- Make Sero AI work fully offline using Ollama only (for now), with a clean interface to add other providers later.
- Move AI settings (e.g., temperature) to be unique per-document.
- Simplify prompt data model to match product usage.
- Add service abstraction and minimal Ollama client using httpx.

Scope (Phase 1)
- Backend only. Frontend adjustments later.
- No DB migrations needed; we will start from a clean DB file.

Key Changes

Tracking (Steps & Actions)
- Phase 1 (done/in progress):
  1) Add AiSettings model and relation (DONE)
  2) Simplify Prompt model to title/prompt/directive/enabled (DONE)
  3) Pydantic schemas for AiSettings + prompts (DONE)
  4) CRUD/controllers/routers for AiSettings (DONE)
  5) Document summary uses document-level temperature (DONE)
  6) Add committed flag to Selection and use only committed in redaction (DONE)
  7) Scaffold AI service abstraction and Ollama client (DONE)
  8) Document-scoped AI apply endpoint scaffold (DONE)

- Phase 2 (up next):
  9) Implement AI apply flow
     - Controller: documents_controller.apply_ai_and_stage
     - Compose prompts from enabled directives
     - Call Ollama through service
     - Parse model response to SelectionCreate with confidence in [0,1]
     - Persist as committed=False
  10) Add endpoint to commit staged selections
      - PATCH /api/documents/id/{document_id}/selections/commit (payload: selection_ids or commit_all)
      - Flip committed=True for selected IDs; return updated selections
  11) Health check endpoint for Ollama (optional)

- Phase 3 (later):
  12) Frontend integration updates for prompts + staged selections UI
  13) Optionally enhance directives and parsing templates

Progress Notes
- All defaults for AiSettings live in the model. No propagation needed elsewhere.
- Percentages are expressed as 0..1 throughout.
1) Database
- New table: ai_settings (Document -> AiSettings is 1:1)
  - provider: str (default "ollama")
  - model_name: str (default from settings.ai.model)
  - temperature: float (0..1, default 0.2)
  - top_p: float | None
  - max_tokens: int | None
  - num_ctx: int | None
  - seed: int | None
  - stop_tokens: list[str] (default [])
  - system_prompt: str | None
  - document_id: FK unique

- Update prompts table to only include:
  - id, created_at, updated_at
  - title: str
  - prompt: text (formerly `text`)
  - directive: str (formerly `type`)
  - enabled: bool
  - languages: list[str] (kept for now)
  - document_id: FK

2) Pydantic Schemas
- New: AiSettings + AiSettingsUpdate
- Update: Prompt, PromptCreate, PromptUpdate
  - Remove temperature
  - Rename text -> prompt, type -> directive, add title, enabled

3) CRUD/Controllers/Routers
- On document create, auto-create AiSettings with defaults from settings.ai
- New endpoints:
  - GET /api/documents/id/{document_id}/ai-settings
  - PUT /api/documents/id/{document_id}/ai-settings
- Update prompts controller/routers for simplified prompt fields
- Update summarize to use document.ai_settings.temperature; keep average_temperature for now as document-level temperature

4) Service Layer (Backend)
- backend/service/ai_service.py: Abstract AiService with a generate and analyze interface.
- backend/core/ai_ollama.py: httpx-based Ollama client used by service implementations.
- Future endpoint (Phase 2): apply prompts to generate selections using the model. For Phase 1, scaffold service and client only.

5) Tests (Guidance)
- Update tests to reflect new schema for prompts
- Add basic tests for ai-settings CRUD (to be implemented later)

Out of Scope (Phase 1)
- Frontend changes (will follow)
- Actual selection generation via AI (Phase 2): service will produce SelectionCreate objects with confidence (is_ai_generated = True when confidence is not None)

Notes
- Use httpx for HTTP calls.
- Keep using uv for Python tasks.
- Keep using pnpm on frontend.
- We will drop the current DB file; no migrations required.

