# Batch Redaction Remediation Plan

Owner: SERO team
Last updated: 2025-08-30
Scope: Backend project redaction streaming + Frontend batch redaction runner and UX

Summary
- Symptom: Batch redaction (project-wide) “worked once, but not anymore” in some cases.
- Goal: Make project-wide redaction streaming robust and user-friendly across repeated runs, scope variations, and trust session boundaries. Provide clear end-state summaries and actionable errors.
- Non-goals: Changing core cryptography, replacing the redaction engine, or introducing a queue system.

Background (current behavior)
Backend endpoint
- POST /api/projects/id/{project_id}/redact/stream
- Request: { key_id, encrypted_password, scope }
- Emits text/event-stream (SSE-like) lines:
  - project_init: { total_documents }
  - project_doc_start: { index, document_id }
  - status: { stage, document_id?, message? }
  - project_doc_summary: { document_id, ok, reason?, redacted_file_id?, original_file_size?, redacted_file_size?, selections_applied }
  - project_progress: { processed, total }
  - completed: { ok }
  - error: { message }

Selection scopes
- document: applies committed selections of scope=DOCUMENT per-document
- project: applies committed selections derived from the project-scoped document (template) with scope=PROJECT
- pan: applies template selections (if present) and document selections together

Password handling
- Decrypt password once from key_id + encrypted_password (ephemeral RSA), then reuse plaintext for all document decrypts.

Observed/likely failure modes
1) Scope mismatch → “no work”
   - If scope=project but no project-scoped template exists, or template has no COMMITTED selections → nothing is applied.
   - If scope=document but documents don’t have COMMITTED selections → nothing is applied.
   - If prior run changed selections/templates, a subsequent run may have no applicable areas.

2) Trust session / ephemeral key expiry
   - The first run works; a later run (minutes later) fails with decrypt errors if the ephemeral key expired and the UI did not re-unlock.

3) Re-run replacement semantics not obvious in UI
   - Backend deletes existing redacted files and replaces them, but the UI does not summarize results clearly or guide the user after completion.

4) Residual client job state
   - If a previous job remains registered, starting a new one may interleave UI signals or hide the fresh job’s completion.

Remediation plan (incremental tasks)

A. Backend improvements
- A1. Extend CompletedEvent with summary counters
  - Add fields: total, succeeded, failed
  - Set ok = (failed == 0)
  - Rationale: The frontend needs a concise end-of-run summary to message users.

- A2. Count outcomes and unify per-doc metadata
  - For each document, track success/failure; maintain processed counter in addition to total.
  - Ensure project_doc_summary always includes selections_applied (0 if none) and normalized reason values.

- A3. Normalize failure reason values
  - Use canonical values: no_committed_selections_for_scope, decrypt_failed, redaction_failed, save_failed.
  - Remove coupled details from reason; put verbose context in status.message if needed.

- A4. Emit explicit NOOP status
  - If total_documents == 0, emit a status event stage=noop (message: "no_documents").
  - If every document results in zero selections (per chosen scope), before completed emit stage=noop (message: "no_applicable_selections").

- A5. Structured logs around batch runs
  - Log one line at project start (project_id, total)
  - Log per-document outcome lines (ok, reason, sizes)
  - Log final summary line (total, succeeded, failed)

- A6. Tests
  - Integration: re-run with preexisting redacted files → verify replacement and correct stream events on both runs.
  - Empty project: total_documents == 0 → receives noop and completed events.
  - Scope mismatch: scope=project without template → all doc summaries should be ok=false with reason=no_committed_selections_for_scope; end summary reflects failures.
  - PAN fallback: ensure both template and document selections apply when present.

B. Frontend improvements
- B1. Cancel stale jobs for same project
  - Before starting a new redaction, call cancelJob(`redact:${projectId}`) to clear any previous registered cancel and state.

- B2. Default scope and remember user choice
  - Default dialog scope to pan.
  - Persist last chosen scope in localStorage (key: sero.redaction.scope) and restore on next run.

- B3. Completion summary UX
  - Parse final CompletedEvent (with total/succeeded/failed) and show a toast/banner like: "Redaction done: 12 total, 10 succeeded, 2 failed".
  - If failed > 0, allow the user to expand details or instruct to review reasons/hints.

- B4. Ephemeral key expiry UX & single auto-retry
  - If onError includes decrypt failures or key expired hints, clear trust for that project and prompt re-unlock.
  - Auto-retry once with fresh credentials; on second failure, surface error and stop.
  - Guard against infinite loops with a per-run retry flag.

- B5. Optional SSE debug logs behind env flag
  - If import.meta.env.VITE_DEBUG_SSE === 'true', log event name + payload in ProjectsAPI.redactProjectStream.

- B6. Hint mapping for per-doc reasons
  - Map no_committed_selections_for_scope → "No selections for chosen scope; try a different scope"
  - decrypt_failed → "Could not decrypt original; verify password"
  - redaction_failed → "Redaction engine error; see logs"
  - save_failed → "Failed to persist file"

C. Documentation updates
- C1. Update public docs (redaction-workflow.md)
  - Clarify scopes and common mistakes (templates vs per-document selections).
  - Document re-run semantics (existing redacted files are replaced).

- C2. Add troubleshooting entries for batch runs
  - Scope mismatch playbook
  - Trust session expiry symptoms and resolution

D. Validation & rollout
- D1. Test matrix
  - Browsers: Chromium, Firefox
  - Slow network profile: SSE stability
  - Large projects: verify streaming stays responsive

- D2. CI: ensure tests run via uv run sero-test and uv run sero-test-cov

- D3. Release notes
  - Mention improved batch summaries, consistent error reasons, and retry UX for trust expiry.

Acceptance criteria
- Backend completed event reports total/succeeded/failed with ok derived from failures == 0.
- Per-document summary events always include selections_applied and normalized reason when ok=false.
- NOOP status event is emitted for no work scenarios.
- Frontend cancels prior job for project before starting a new one.
- Frontend defaults to pan, persists scope across sessions.
- Frontend shows clear final summary; for failures, hints are actionable and derived from reason.
- One-shot auto-retry on trust-expiry failures works and avoids infinite retry.
- Tests cover re-run, empty project, scope mismatch, and pan path.

Implementation sequence (small commits)

Backend
1) A1+A2: Extend CompletedEvent and implement counters
   - Schema change: CompletedEvent { ok: bool, total: int, succeeded: int, failed: int }
   - projects_controller.redact_stream: initialize counters, increment per outcome, emit completed with counts.
   - Commit: feat(api): summarize project redaction results in completed event

2) A3: Normalize reasons and selections_applied
   - Ensure all project_doc_summary ok=false branches use normalized reasons and set selections_applied.
   - Commit: fix(api): normalize batch redaction failure reasons and selections_applied

3) A4: NOOP status events
   - Detect no documents and no applicable selections overall; emit status stage=noop with message.
   - Commit: feat(api): emit noop status on project redaction when no work

4) A5: Structured logging
   - Add log lines at start, per-document, and final summary.
   - Commit: chore(api): improve project redaction logging

5) A6: Tests for re-run, empty project, scope mismatch, pan
   - Add tests in tests/test_projects_controller.py (or new dedicated module) for each scenario.
   - Commit: test(api): add project redaction stream coverage for re-runs and edge cases

Frontend
6) B1: Cancel stale jobs
   - In startProjectRedaction, cancel any existing job id before start.
   - Commit: fix(frontend): cancel previous redaction job before starting new

7) B2: Default to pan + remember scope
   - Update dialog initial value to pan; read/write localStorage.
   - Commit: feat(frontend): default project redaction scope to pan and persist choice

8) B3: Completion summary UX
   - Update handler to read total/succeeded/failed from completed payload; show toast.
   - Commit: feat(frontend): show final batch redaction summary with counts

9) B4: Trust expiry retry
   - Detect decrypt-related onError; clear trust for project and retry once.
   - Commit: feat(frontend): auto-retry project redaction once after trust refresh on decrypt failure

10) B5: Debug SSE logs
    - Env-guarded console logging of SSE events.
    - Commit: chore(frontend): add SSE debug logs behind VITE_DEBUG_SSE

11) B6: Map reasons to hints
    - Map reason → human hint on per-doc summaries.
    - Commit: feat(frontend): user-friendly hints for per-document batch redaction outcomes

Docs
12) C1+C2: Update user docs
    - Expand redaction-workflow.md and troubleshooting guidance.
    - Commit: docs: clarify batch redaction scopes, retries, and re-run semantics

Validation
13) D1+D2: Test and coverage
    - Run: uv run sero-test-cov, verify pass and coverage ≥ 85%.
    - Commit: ci: validate batch redaction improvements via test suite

Rollback strategy
- All changes are additive or localized. Revert any step via git revert per semantic commit.

Operational notes
- Password handling: frontend must prompt re-unlock if ephemeral key expires; auto-retry is bounded.
- Replacement semantics: backend deletes existing redacted files before saving new ones.

Progress tracker (update as we land changes)
- [x] A1 Backend completed summary fields
- [x] A2 Backend counters + consistent selections_applied in summaries
- [x] A3 Backend normalized reasons
- [x] A4 Backend NOOP status
- [ ] A5 Backend structured logs
- [ ] A6 Backend tests: re-run, empty project, scope mismatch, pan
- [ ] B1 Frontend cancel stale job
- [ ] B2 Frontend default=pan and persist
- [ ] B3 Frontend completion summary UX
- [ ] B4 Frontend trust expiry retry
- [ ] B5 Frontend debug SSE logs
- [ ] B6 Frontend reason→hint mapping
- [ ] C1+C2 Docs updates
- [ ] D1+D2 Test/coverage validation

