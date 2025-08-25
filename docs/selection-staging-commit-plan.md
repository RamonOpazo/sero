# Selection Staging & Commit Plan

Status: Draft
Owner: Frontend & Backend
Last updated: 2025-08-24

## 0. Summary and Principles

- Local-only state: New selections begin with state = undefined on the client. The server only ever stores enum states.
- Single source of truth: Frontend makes semantic requests; server enforces all rules and transitions.
- Commit scope: Commit acts only on staged selections. Unstaged (local) drafts are not committed unless the user opts to stage them first via an explicit control.

## 1. Selection State Model

Server enum states (authoritative):
- committed
- staged_creation
- staged_edition
- staged_deletion

Client transient state:
- undefined (local-only) for newly created but not yet staged selections.

### Transitions
- Create: local draft (undefined) → Stage all → server create with state=staged_creation.
- Edit (persisted selection): local change marks selection with state=staged_edition; Stage all pushes updates with state=staged_edition.
- Delete (persisted selection): do NOT delete locally; mark state=staged_deletion; Stage all pushes update state=staged_deletion. Actual removal happens on commit.
- Committed selections are read-only. Double-click opens a dialog to convert them to staged_edition.

## 2. Visual Cues

- All selections: striped background already in place remains.
- Borders:
  - Unstaged (local undefined): dashed border.
  - Staged (creation/edition/deletion): solid border.
  - Committed: double solid line.
- Colors:
  - Unstaged (new): green.
  - Staged creation: blue.
  - Staged edition: yellow.
  - Staged deletion: red.
  - Committed: gray.
- Global selections: crossed diagonal stripes overlay; color still derives from state.

Notes: Use Tailwind tokens (suggestion):
- Green: emerald-500/600
- Blue: blue-500/600
- Yellow: amber-500/600
- Red: red-500/600
- Gray: zinc-500/600 (or neutral/stone as per theme)

## 3. Frontend: Behavior and UI

### Drawing / Create
- During draw and after finishing draw: keep selection in draftItems with state undefined (local only).
- Stage all triggers createSelection with state=staged_creation via transforms.forCreate.

### Edit
- Persisted selection edited locally: mark state=staged_edition (do not push immediately).
- Stage all: send update including state=staged_edition and geometry.

### Delete
- Draft (unstaged/undefined): remove locally.
- Persisted: update selection to state=staged_deletion locally (do not remove from list/layer). Stage all: send update with state=staged_deletion.

### Double-click on committed
- Open dialog “Convert to staged edition?” (TypedConfirmationDialog or SimpleConfirmationDialog) → on confirm, request server to move state to staged_edition (via update endpoint). After that, edits behave like staged items.

### Stage all changes
- Calls manager.save():
  - Creates: POST with state=staged_creation.
  - Updates: PUT preserving state if staged_deletion; otherwise set to staged_edition for geometry edits.
  - Deletes: none (we avoid DELETE for persisted, model them as updates to staged_deletion).

### Commit all staged
- Confirmation dialog (TypedConfirmationDialog) with:
  - Slider (shadcn Switch) default OFF: “Also stage unsaved work before commit”.
  - Messages that explain:
    - Only staged selections will be committed.
    - New unstaged selections will be lost unless you stage them now.
    - Staged deletions will be destroyed.
  - Flow on confirm:
    - If slider ON: call save() first to stage any unsaved work.
    - Always call backend commit endpoint to commit staged selections and destroy staged_deletions.

### Visual updates
- selections-layer.tsx: apply borders and colors per state, including double border for committed, dashed for unstaged.
- selection-list.tsx: status badges reflect state/type; remove “modified/saved/new” trio in favor of the new state-categorization, keeping counts.
- Disable global page selector on committed selections; only non-committed allow page/global toggle.

## 4. Backend: Endpoints and Logic

- Create selection: defaults to STAGED_CREATION if client sends it; client will only create when staging.
- Update selection: allow state transitions to STAGED_EDITION and STAGED_DELETION; ignore attempts to change committed content except allowing conversion to staged_edition.
- Commit staged selections:
  - Input: { selection_ids?: UUID[] | null, commit_all?: bool }.
  - Behavior:
    - For all staged_creation and staged_edition in scope: set state=COMMITTED (preserve geometry already in row).
    - For all staged_deletion in scope: DELETE rows.
    - Return committed selections and/or summary.
- Validate server-side rules:
  - Reject geometry changes to COMMITTED unless converted to staged_edition.
  - For STAGED_DELETION, no further edits allowed except reverting state.
  - Optionally provide an endpoint to convert a committed selection to staged_edition (or reuse update endpoint with state change only).

## 5. Data Contracts and Transforms

Frontend transforms (selection-config.ts):
- forCreate: enforce state: 'staged_creation'.
- forUpdate: if selection.state === 'staged_deletion', keep state as 'staged_deletion'; else set 'staged_edition' and pass geometry updates.
- fromApi: map server state to Selection; committed arrives as committed, etc.

Pending changes computation:
- Delete path must not be used for persisted removals; instead model as update to staged_deletion so it appears under "updates" and not "deletes".

## 6. Commit Dialog UX

- Component: extend Stage & Commit commander dialog to include a Switch (slider), default OFF.
- Messages include:
  - Warning (Irreversible): committing will finalize staged selections.
  - Info: unstaged (new) selections will be discarded unless you stage them now.
  - Info: staged deletions will be destroyed.
  - Success: scope summary – X staged creations + Y staged editions + Z staged deletions.
- Confirmation word: "commit".

## 7. Subtasks (Implementation Order)

0) Save this plan document (this file).
1) Frontend selection-config.ts and provider adjustments:
   - Keep draft state undefined during draw/finish.
   - Modify deleteSelection to update state to staged_deletion for persisted items; remove drafts.
   - Adjust transforms.forUpdate to preserve staged_deletion; otherwise use staged_edition.
2) Visual cues in selections-layer and selection-list:
   - Borders, colors, stripes, disable page/global toggle for committed.
3) Double-click on committed → dialog to convert to staged edition (frontend flow + API call).
4) Commit dialog changes:
   - Add Switch (default OFF) “Also stage unsaved work”.
   - Implement flow: if ON → save(); then commit staged on server.
   - Comprehensive alerts.
5) Backend endpoints and rules:
   - Update selection update logic to allow state transitions and reject illegal edits to committed.
   - Commit endpoint: commit staged creations/editions and delete staged_deletions.
   - Tests for transitions and commit semantics.
6) Final pass, QA, and docs.

## 8. Acceptance Criteria

- Creating a selection leaves it with state undefined locally until "Stage all" is clicked.
- Editing a persisted selection marks it as staged_edition locally; "Stage all" saves it with that state.
- Deleting a persisted selection marks it as staged_deletion locally; "Stage all" records the change on the server, actual deletion occurs on commit.
- Committed selection double-click flows to a dialog that converts it to staged_edition.
- Commit with slider OFF commits only already staged items; unstaged drafts are discarded.
- Commit with slider ON stages drafts first and then commits them.
- Visual cues match definitions above, including double border for committed and dashed for unstaged.

## 9. Risks / Notes

- Domain manager current pending-changes logic treats true removals as deletes. We will avoid using DELETE for persisted items and instead update state to staged_deletion to keep them in updates.
- Ensure backend API can handle state-only updates (no geometry) and reject illegal transitions.


