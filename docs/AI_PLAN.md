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

- Phase 2 (status):
  8.1) Centralize prompt composition (DONE)
  9) Implement AI apply flow (DONE)
     - Controller: documents_controller.apply_ai_and_stage implemented and tested
     - AiService: encapsulates Ollama logic with hardened JSON parsing/clamping
     - Parses model response into SelectionCreate with confidence in [0,1]
     - Persists as committed=False
  10) Add endpoint to commit staged selections (DONE)
      - PATCH /api/documents/id/{document_id}/selections/commit (payload: selection_ids or commit_all)
      - Flip committed=True for selected IDs; return updated selections
  11) Health check endpoint for Ollama (DONE)
      - GET /api/ai/health -> { ok: boolean }
  12) Manage staged selections (DONE)
      - POST /api/documents/id/{document_id}/selections/staged/clear (selection_ids or clear_all)
      - PATCH /api/documents/id/{document_id}/selections/uncommit (selection_ids or uncommit_all)

- Phase 3 (later):
  12) Frontend integration updates for prompts + staged selections UI
  13) Optionally enhance directives and parsing templates

Architecture Notes
- Removed Project.version across backend (models, schemas, controllers, routers, tests) to simplify the Project model. Tests refactored accordingly.
- Centralized prompt composition in backend/service/prompt_composer.py used by AiService.
- AiService also exposes health() so all AI concerns are abstracted.
- All AI functionality is abstracted via AiService; controllers remain declarative.
- AiService also exposes health() so all AI concerns are abstracted.
- All AI functionality is abstracted via AiService; controllers remain declarative.

Progress Notes
- Pydantic v2 migration: replaced class-based Config with ConfigDict(from_attributes=True) in all schemas; tests run clean without deprecation warnings.
- Ensured clean asyncio loop shutdown in tests to eliminate ResourceWarning.
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
- Update tests to reflect new schema for prompts (DONE)
- Add tests for AI router health endpoint (DONE)
- Improve service coverage: security_service and redactor_service (TODO)

Out of Scope (Phase 1)
- Frontend changes (will follow)
- Actual selection generation via AI (Phase 2): service will produce SelectionCreate objects with confidence (is_ai_generated = True when confidence is not None)

Notes
- Use httpx for HTTP calls.
- Keep using uv for Python tasks.
- Keep using pnpm on frontend.
- We will drop the current DB file; no migrations required.


Frontend Integration Plan (Phase F)

Goals
- Align the frontend type system and API modules with the latest backend contracts (post-version removal, simplified Prompt model, Selection committed lifecycle, AI settings).
- Preserve strong typing by mirroring backend schemas via zod as closely as possible.
- Bring UI to functional parity (create/update/delete projects, documents, files, prompts; AI actions; selection lifecycle; downloads).
- Add a sustainable test strategy for types, libs, providers, and core components.

Key Backend → Frontend Alignment Items
- Project
  - version field removed entirely.
  - ProjectSummary schema: ensure fields match backend (no unique_languages or average_temperature at project level).
- Prompt
  - Simplified schema: title, prompt, directive, enabled, document_id.
  - Remove text, temperature, languages from Prompt schema/types and all usages.
- Selection
  - Ensure committed: boolean exists in schema and types.
  - SelectionCreate default committed=false; respect normalized [0,1] bounds for x,y,width,height,confidence.
- Document
  - Existing DocumentSummary retains average_temperature (from AiSettings) and prompt_languages; keep aligned with backend.
- AI Router
  - /api/ai/health exists; add minimal UI wiring for health indicator if needed.

Work Breakdown Structure (WBS)

F1. Type System Audit and Refactor (zod schemas)
- src/frontend/src/types/project.ts
  - Remove version from ProjectSchema, ProjectShallowSchema, ProjectCreateSchema, ProjectUpdateSchema, ProjectSummarySchema.
  - Align ProjectSummarySchema to backend fields: remove unique_languages and average_temperature at project level if present.
- src/frontend/src/types/prompt.ts
  - Replace fields with: { id, created_at, updated_at, title, prompt, directive, enabled, document_id }.
  - Remove text, temperature, languages from Schema/Create/Update types. Update types accordingly.
- src/frontend/src/types/selection.ts
  - Add committed: z.boolean() to SelectionSchema; include committed? in SelectionCreate / SelectionUpdate.
  - Ensure numeric bounds 0..1 remain for normalized coordinates and confidence.
- src/frontend/src/types/document.ts
  - Verify DocumentSchema/DocumentShallowSchema/DocumentSummarySchema match backend. Keep average_temperature and prompt_languages per backend.
  - Ensure original_file and redacted_file are nullable computed fields.
- src/frontend/src/types/file.ts
  - Confirm data and salt serialization shapes (string truncation for display only; transport as bytes/base64 where needed).
- src/frontend/src/types/api.ts
  - Confirm Success/Error/Paginated unchanged; adjust if any API response changed.

F2. API Modules Alignment (src/frontend/src/lib)
- projects-api.ts (DONE)
  - Removed version usage; aligned endpoints and return types.
- documents-api.ts (DONE)
  - Shallow list, search by project, create/update returning full Document then mapped to shallow, delete, bulk upload (Success), process via encrypted password JSON.
  - Added: fetchDocumentShallow, fetchDocumentSummary, fetchDocumentTags.
- document-viewer-api.ts (IN PROGRESS)
  - Prompts: create/list/update/delete aligned to simplified fields (DONE).
  - Selections: list/create/update/delete (DONE).
  - AI flows: apply AI, commit/uncommit/clear staged (DONE).
  - AI settings: get/update (DONE).
- editor-api.ts (PARTIAL)
  - Original/redacted file downloads via document endpoints (DONE); loads prompts/selections are stubbed (TODO if needed).
- files (N/A separate module)
  - Downloads covered via editor-api; bulk upload via documents-api (DONE).
- ai (PARTIAL)
  - Health endpoint available; minimal UI wiring pending.

Notes
- Crypto endpoints fixed to /api/security/* for ephemeral RSA keys and stats.
- All Result<T> wrappers and toasts aligned across modules.

F3. UI/Views Adjustments
- Projects (DONE)
  - projects-data-table.tsx: removed version column and options (DONE).
  - dialogs/create-project-dialog.tsx: removed version from form and payload (DONE).
  - dialogs/edit-project-dialog.tsx: removed version handling (DONE, if applicable).
- Documents view
  - Empty-state: "Upload your first document" opens dialog even when list is empty (FIXED, DONE).
  - Prompt UI: aligned to new fields (title/prompt/directive/enabled) and integrated with provider/manager (DONE).
  - Selection lifecycle UI: wire apply AI, commit/uncommit/clear staged actions (PENDING - next).
  - Downloads: original/redacted endpoints used; password encryption with ephemeral key (DONE).

F4. Type-Driven Contract Tests (Frontend)
- Add tests that validate representative backend JSON against zod schemas.
  - ProjectSchema/ProjectShallowSchema/ProjectSummarySchema: parse samples (from backend tests or fixtures) and assert success.
  - PromptSchema/PromptCreate/PromptUpdate: ensure failing shapes (with old text/temperature/languages) are rejected.
  - SelectionSchema/SelectionCreate: include committed property; ensure normalized values enforced.
  - DocumentSchema/DocumentSummarySchema: assert computed and summary fields parse.
- Where feasible, build “roundtrip” helpers that serialize/deserialize and ensure type safety remains intact.

F5. API Module Unit Tests
- Mock axios/api.safe and verify:
  - Correct endpoints and query param composition.
  - Payloads include only backend-supported fields (no version, no prompt temperature/text).
  - Error paths show toasts and return Result error as expected.
- Coverage targets: ≥90% per API module.

F6. Provider/Hook Tests
- For providers (e.g., prompt-provider.tsx) and domain manager integrations:
  - Use React Testing Library with msw (Mock Service Worker) to mock network calls where appropriate.
  - Verify action flows: fetch → create → update → delete; state transitions and error handling.
  - Verify selection lifecycle (commit/uncommit/clear) end-to-end in a view-model test.

F7. Component/Integration Tests
- Co-located component tests (critical components):
  - ProjectsDataTable: rendering, sorting, column toggling; create/delete flows (mock API).
  - Documents view: prompt add/update/remove; AI apply and staged selections visibility; commit/uncommit/clear flows.
- Integration tests (few, high-value):
  - Projects view happy path: create → list → edit → delete.
  - Documents flow: create document → upload/bulk upload → apply AI → stage/commit selections → redact/download.

F8. Test Organization Guidance for React
- Recommended structure:
  - Co-locate unit tests with their modules for tight feedback (e.g., src/.../module.ts → module.test.ts).
  - Maintain a top-level integration tests directory for cross-cutting flows (e.g., src/__tests__/integration/* or src/tests/integration/*).
  - Use Testing Library for components/hooks; msw for network; jest-dom for assertions.
  - Keep test utilities in src/test-utils/ (custom render, mock providers, fixtures).
- Pros of co-location:
  - Easier maintenance; tests evolve with modules.
  - Clear discoverability of tests related to a file.
- Pros of centralized integration tests:
  - Orchestrate complex flows; easier environment setup.
- Avoid: one giant unified test directory only; it hinders discoverability and slows dev velocity.

F9. Incremental Execution Plan
- Step 1: Types (DONE)
  - Implement F1 type changes; run typecheck and build.
- Step 2: API modules (IN PROGRESS)
  - Projects API (DONE), Documents API (DONE), Document Viewer API for prompts/selections/AI settings (DONE), editor-api downloads (DONE), AI health (PENDING UI wiring).
  - Smoke test calls with mocked backend or dev server.
- Step 3: UI adjustments (IN PROGRESS)
  - Projects view fixes (DONE).
  - Documents view: prompt CRUD (DONE), empty-state upload fix (DONE), selection lifecycle UI (PENDING next), AI settings panel (PENDING), AI apply controls (PENDING).
- Step 4: Tests
  - Add type contract tests (F4) and API tests (F5) incrementally.
  - Add provider and key component tests (F6, F7).
- Step 5: Integration tests
  - Implement 1–2 high-value integration tests to cover end-to-end flows.

Immediate Next Tasks (Frontend)
- Wire selection lifecycle UI: apply AI, show staged selections, commit/uncommit/clear actions in the document viewer.
- Add AI settings panel in viewer using getAiSettings/updateAiSettings.
- Optional: load prompts/selections in EditorAPI when fetching files to pre-populate viewer state.

F10. Definition of Done (Frontend Phase)
- All types reflect backend contracts; no lingering version or deprecated fields.
- API modules pass unit tests and manual smoke tests.
- Key views (Projects/Documents) work with the updated backend.
- New tests added: types, APIs, providers, and at least one integration scenario.
- CI runs with frontend unit tests passing.

