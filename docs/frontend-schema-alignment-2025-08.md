# Frontend Schema Alignment Plan (2025-08)

Status: DRAFT
Owner: frontend/platform
Scope: Align frontend zod schemas, API clients, and UI adapters with the current backend contracts.

## Goals
- Make frontend schemas a faithful mirror of backend Pydantic schemas.
- Remove legacy, deprecated fields and document-scoped AI settings from the frontend.
- Ensure API clients hit the correct endpoints and payloads.
- Keep the UI behavior stable by providing minimal mapping layers where necessary.

## Backend canonical reference (paths)
- Enums: `src/backend/api/enums.py`
  - ProjectStatus: AWAITING, IN_PROGRESS, COMPLETED
  - DocumentStatus: PENDING, PROCESSED, FAILED
  - PromptLanguage: CATALONIAN, CASTILLIAN, ENGLISH
  - FileType: ORIGINAL, REDACTED
  - ScopeType: PROJECT, DOCUMENT
  - CommitState: STAGED, COMMITTED

- Documents: `src/backend/api/schemas/documents_schema.py`
  - Document: id, created_at, updated_at, name, description, project_id, files[], prompts[], selections[], template?
  - DocumentShallow: id, created_at, updated_at, name, description, project_id, prompt_count, selection_count, is_processed, is_template
  - DocumentSummary: document_id, name, description, created_at, updated_at,
    project_name, project_id, is_processed, is_template,
    has_original_file, has_redacted_file, original_file_size, redacted_file_size, total_file_size,
    prompt_count, selection_count, ai_selections_count, manual_selections_count,
    prompt_languages (array)

- Prompts: `src/backend/api/schemas/prompts_schema.py`
  - Prompt: id, created_at, updated_at, scope: ScopeType, state: CommitState,
    title(max 150), prompt, directive(max 50), document_id
  - PromptCreate: scope default DOCUMENT, state default STAGED
  - PromptUpdate: scope?, state?, title?, prompt?, directive?

- Selections: `src/backend/api/schemas/selections_schema.py`
  - Selection: id, created_at, updated_at, scope: ScopeType, state: CommitState,
    page_number | None, x,y,width,height (0..1), confidence | None,
    document_id, is_ai_generated, is_global_page
  - SelectionCreate: scope default DOCUMENT, state default STAGED, same geometry, document_id
  - SelectionUpdate: scope?, state?, geometry?, confidence?

- Settings (Project-level): `src/backend/api/schemas/settings_schema.py`
  - AiSettings: id, timestamps, provider(max 50), model_name(max 100), temperature(0..1),
    top_p(0..1)|None, max_tokens>0|None, num_ctx>0|None, seed|None,
    stop_tokens: list[str], system_prompt|None, project_id
  - AiSettingsUpdate: all fields optional

- Project Summary: `src/backend/api/schemas/projects_schema.py`
  - ProjectShallow: includes has_template boolean (plus document_count, has_documents)
  - ProjectSummary: includes totals; template presence is `has_template`

- Routers (AI settings): `src/backend/api/routers/projects_router.py`
  - GET /projects/id/{project_id}/ai-settings
  - PUT /projects/id/{project_id}/ai-settings

## Frontend current state (highlights of mismatches)
- types/document.ts
  - Uses `tags` on Document/DocumentShallow/Minimal (not in backend).
  - Has DocumentSummary fields: tag_count, tags, average_temperature (not in backend).
  - Defines DocumentAiSettings/DocumentAiSettingsUpdate (document-scoped; backend is project-scoped).

- types/prompt.ts
  - Uses `enabled: boolean` instead of `state: CommitState` and `scope: ScopeType`.

- types/selection.ts
  - Uses `committed: boolean` and lacks `state`, `scope`, and `is_global_page`.

- types/enums.ts
  - Missing `ScopeType` and `CommitState`.

- lib/document-viewer-api.ts
  - Calls document-level AI settings endpoints (no longer valid).
  - Prompt update API expects `enabled`.

- views/projects-view/dialogs/project-ai-settings-dialog.tsx
  - UI exists; currently not wired to backend project endpoints.

## Alignment rules
- Replace boolean flags with enums:
  - Prompt.enabled => Prompt.state: COMMITTED when enabled=true, STAGED when false.
  - Selection.committed => Selection.state: COMMITTED when true, STAGED when false.
- Introduce `scope: ScopeType` in prompt/selection create/update/read.
- Add `is_template` to DocumentShallow and DocumentSummary (as backend provides).
- Update DocumentSummary to include `ai_selections_count`, `manual_selections_count`; remove tag-related fields not provided by backend.
- Remove document-scoped AI settings from frontend. Add project-scoped AI settings types and APIs.

## Work items (compartmentalized)

1) Enums (types/enums.ts)
- [ ] Add `ScopeType` = ['project', 'document']
- [ ] Add `CommitState` = ['staged', 'committed']
- [ ] Export types and use them across app

2) Prompts (types + API + adapters)
- types/prompt.ts:
  - [ ] Replace `enabled: boolean` with `scope: ScopeType` and `state: CommitState` on Prompt/PromptCreate/PromptUpdate
- lib/document-viewer-api.ts:
  - [ ] Update `updatePrompt` payload to accept `{ scope?, state?, title?, prompt?, directive? }`
- components/features/document-viewer/core/prompt-config.ts:
  - [ ] Update transforms: map UI booleans (if any) to state
  - [ ] Update comparators to ignore state-to-enabled legacy
- components/features/document-viewer/providers/prompt-provider.tsx and prompt-commander.tsx:
  - [ ] Replace any usage of `enabled` with `state === 'committed'`

3) Selections (types + API + adapters)
- types/selection.ts:
  - [ ] Replace `committed: boolean` with `scope: ScopeType`, `state: CommitState`, and add `is_global_page: boolean`
- lib/document-viewer-api.ts:
  - [ ] Ensure update/create payloads no longer send `committed`, but use commit endpoints (already present) and geometry updates only
- components/features/document-viewer/core/selection-config.ts:
  - [ ] Update fromApi/forCreate to map `state` and drop `committed`
  - [ ] Keep internal viewer `Selection` shape stable as needed, but ensure server payloads align

4) Documents (types + summary)
- types/document.ts:
  - [ ] Remove `tags` from Document/DocumentShallow/Minimal
  - [ ] Add `is_template` to DocumentShallow
  - [ ] Update `DocumentSummarySchema`:
    - [ ] Include `ai_selections_count`, `manual_selections_count`, `is_template`
    - [ ] Remove `tag_count`, `tags`, `average_temperature` (not provided)

5) AI Settings (project-scoped)
- types: add new types/settings.ts or expand types/project.ts
  - [ ] Define `ProjectAiSettings` and `ProjectAiSettingsUpdate` aligned to backend settings_schema.AiSettings/AiSettingsUpdate
- lib/projects-api.ts:
  - [ ] Add `getProjectAiSettings(projectId)` -> GET /projects/id/{project_id}/ai-settings
  - [ ] Add `updateProjectAiSettings(projectId, data)` -> PUT /projects/id/{project_id}/ai-settings
- lib/document-viewer-api.ts:
  - [ ] Remove document-level AI settings functions
- views/projects-view/dialogs/project-ai-settings-dialog.tsx & use-projects-view.ts:
  - [ ] On open, fetch current project AI settings to populate initial
  - [ ] On submit, normalize `stop_tokens` string to list and call ProjectsAPI.updateProjectAiSettings

6) Cleanup legacy references
- [ ] Remove references to document-scoped AI settings: types/document.ts, lib/document-viewer-api.ts, any components using `DocumentAiSettings*`
- [ ] Replace all `enabled` and `committed` uses with enum-aware logic

7) Compile, type-check, and smoke test
- [ ] Run type checker (tsc) and fix any type fallout
- [ ] Manual smoke: prompts create/update, selection workflows, AI commit/uncommit flows, projects AI settings dialog

## Mapping cheatsheet
- enabled (frontend) -> state (backend): enabled=true => COMMITTED; false => STAGED
- committed (frontend) -> state (backend): committed=true => COMMITTED; false => STAGED
- Add scope where omitted: default DOCUMENT
- Document AI settings (frontend) -> Project AI settings (backend)

## Acceptance criteria
- Frontend builds without type errors.
- No requests go to `/documents/.../ai-settings`.
- Prompt and selection payloads match backend: include state/scope, no legacy booleans.
- Project AI settings dialog fetches and updates via `/projects/id/{id}/ai-settings`.
- Document shallow and summary views render without missing-field runtime errors.

## Out-of-scope (for this pass)
- UI/UX redesign for showing state/scope; we adapt minimal logic for parity.
- Backend changes (assumed stable).

## Appendix: API endpoints touched
- GET /projects/shallow, GET /projects, GET /projects/id/{id}
- GET /projects/id/{id}/ai-settings
- PUT /projects/id/{id}/ai-settings
- GET/POST/PUT/DELETE prompts under /documents/id/{id}/prompts and /prompts/id/{id}
- Selection commit/uncommit/clear endpoints under /documents/id/{id}/selections

