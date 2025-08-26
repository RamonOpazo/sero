# AI Processing Progress — Telemetry, UI, and UX Plan

Goals
- Provide clear, live feedback during AI processing for both document- and project-level runs.
- Auto-refresh selections and open the Selection Manager on completion.
- Add a global, non-modal, persistent indicator (“chin”) for progress, milestones, warnings, and quick access to details.

Scope (Phase A)
- Backend: enrich streaming telemetry (done for request_sent) — connecting_provider, model_catalog, loading_model, first-token progress; maintain stages and percents.
- Frontend: add a global ProcessingProvider and a minimal GlobalProcessingChin UI that hooks into the SSE stream to display progress.
- Prompt panel: after completion, refresh selections and open Selection Manager automatically.
- Project runs: support batch progress and aggregate milestones.

What we have today
- SSE events for document runs: status (stage, index, total, percent), model, tokens, staging_progress, summary, completed, error.
- SSE events for project runs: project_init/progress/doc_start/doc_summary + per-document status/tokens/staging_progress/completed.
- Frontend prompt panel: shows stage bar and token chars; refreshes selections on summary.
- Password dialog integrated for AI runs; backend extracts page-indexed text for grounding.

Planned enhancements
1) Selections refresh + Selection Manager open
- On completed { ok: true }:
  - selectionProvider.reload()
  - selectionProvider.openManager() (or equivalent UI action)

2) Global Processing infrastructure (frontend)
- ProcessingProvider (context)
  - startJob({ id, kind, title, stage, percent, hints[], link, meta })
  - updateJob({ id, stage?, percent?, hints+=[], batchProcessed?, batchTotal? })
  - completeJob(id)
  - failJob({ id, errorMessage })
  - clearJob(id)

- Job model
  - id: string (documentId or `project:<projectId>`)
  - kind: 'document' | 'project'
  - title: string (e.g., “AI Detection: <doc name>”)
  - stage: string (matching SSE)
  - stageIndex: number
  - stageTotal: number
  - percent: number (0..100)
  - batchProcessed?: number (only for project runs)
  - batchTotal?: number (only for project runs)
  - hints: string[] (brief stage messages: connecting_provider, loading_model, first token received, etc.)
  - link?: string (route to details view)
  - meta: { documentId?: string, projectId?: string, runId?: string }

3) Global Processing Chin (UI component)
- Positioning & layout
  - Full width, bottom of the viewport, outside the sidebar/content layout so it actually spans 100% width.
  - Height: ~1.5rem.
  - Visual: thin, unobtrusive, always visible when a job is running; can persist for a few seconds after completion.

- Content (left → right)
  1) Milestone index/total (e.g., “3/9”)
  2) Milestone name (e.g., “loading_model”, “generating”, …)
  3) Milestone subtask (e.g., “first token received”, or “catalog: found model”)
  4) Warning slot (optional)
     - Example: provider not reachable, model not in catalog, or slow warm-up hint.
  5) Progress bar (primary)
     - Overall progress percent

- Optional (batch mode): secondary inline text (“Documents 2 of 10”) may appear within the chin (e.g., to the right of the milestone name or before the bar).

- Props for chin component (example)
  - stageLabel: string
  - stageIndex: number
  - stageTotal: number
  - subtaskLabel?: string
  - warning?: { message: string, code?: string }
  - percent: number (0..100)
  - batch?: { processed: number, total: number }
  - link?: string (for details)
  - onClickLink?: () => void

- Interaction
  - Always visible while any job is active; if multiple jobs, show the most recent or allow cycling.
  - Clicking “View details” navigates to a details route (see below) — can be stubbed initially.

4) Details view (stub for now)
- Route: `/projects/:projectId/documents/:documentId/ai-runs/:runId` (or a general `/ai/runs/:runId`)
- Content:
  - Current: show job meta, current/last stage, hints collected client-side.
  - Future: show recorded SSE timeline (if persisted), provider diagnostics, and re-run controls.

Event wiring
- Document run
  - On stream start: startJob({ id: documentId, kind: 'document', title, stage: 'start', percent: 2 })
  - On status: updateJob({ id, stage, stageIndex, stageTotal, percent, hints+=[] })
  - On staging_progress: updateJob({ id, percent, stage: 'staging' })
  - On summary: push a hint with { returned, filtered_out, staged }
  - On completed: completeJob; auto-refresh selections; open Selection Manager
  - On error: failJob({ id, errorMessage }); keep chin visible with warning

- Project run
  - Parent job id: `project:<projectId>`
  - On project_init: startJob({ id: parentId, kind: 'project', title: “AI Detection: Project <name>”, batchTotal, percent: 2, stage: 'start' })
  - On project_progress: updateJob({ id: parentId, batchProcessed, batchTotal })
  - On per-doc status: updateJob for parent with stage/hints; optionally also spawn child jobs for per-doc details.
  - On project completion: completeJob(parentId)

Backend milestones (emitted today)
- status.stage: start, compose_prompt, connecting_provider, model_catalog, loading_model, request_sent, generating (first token then periodic), parsing, merging, filtering, staging, done
- staging_progress: { created, total, percent }
- summary: { returned, filtered_out, staged, min_confidence }
- project_*: project_init, project_progress, project_doc_start, project_doc_summary

Implementation plan (phased)
Phase 1 — Wiring + Chin skeleton
- Add ProcessingProvider, job model, and public API.
- Add GlobalProcessingChin component (layout at app root); small, full width, 1.5rem tall.
- Hook prompt panel AI stream to ProcessingProvider (start/update/complete/fail), feeding stage + percent + hints.
- On completed, explicitly:
  - await selectionProvider.reload()
  - selectionProvider.openManager()

Phase 2 — Batch mode & UX polish
- In project stream flows, update parent job with batch progress (processed/total), and reflect in chin as inline text.
- Display the warning slot in chin when connecting_provider is false or model_catalog.available is false.
- Chin: subtle animated progress bar; tile gradient upon completion.

Phase 3 — Details view & persistence (optional)
- Add route stub to show in-flight job info.
- Persist run summaries on the backend (optional), returning runId from stream init; the chin’s link points to persisted run page.

Acceptance criteria
- The global chin appears on AI runs, stays visible during processing, and shows:
  - milestone index/total (e.g., 3/9), milestone name (e.g., “generating”), subtask/hints where available, warning slot when relevant, overall progress bar.
- On completion for document runs:
  - selections are refreshed and the Selection Manager opens automatically.
- In project runs:
  - chin shows batch progress (processed/total) as inline text, and reflects stage transitions coming from per-document events.
- No secrets stored; only keyId/encryptedPassword sent inline at request-time and never persisted; chin and provider state do not log secrets.

Open questions
- Multiple concurrent jobs: show the most recent only or a collapsible list?
- Where to place the secondary batch progress (text-only or a second subtle bar)?
- How long should completed jobs remain visible in the chin before auto-hiding?
- Should we show token throughput (chars) in the chin, or keep it only in the prompt panel?

Notes
- Keep chin outside the content layout to ensure full-width.
- Ensure a11y with aria labels for stage and progress.
- Keep the “View details” link wired even if the page is stubbed — users can click and see a placeholder.

