# Selection Lifecycle Refactor Plan

Goal
- Replace legacy persisted/draft/baseline change-tracking with a single, explicit lifecycle state machine for selections.
- Drive UI and behavior from lifecycle state only; translate to API payloads on save/commit.

Lifecycle model
- SelectionStage enum: `unstaged` | `staged_creation` | `staged_edition` | `staged_deletion` | `committed`
- UISelection fields:
  - All Selection fields required by UI (id, geometry, page_number, etc.)
  - stage: SelectionStage
  - isPersisted: boolean
  - dirty: boolean
  - optional: dirtyFields: Set<string>

Mappers
- fromApiSelection(sel) -> UISelection
  - isPersisted=true
  - stage derived from sel.state (fallback to committed if unknown)
  - dirty=false
- toApiCreate(uiSel) -> SelectionCreate
- toApiUpdate(uiSel) -> Partial<Selection>
- mergeServerResponse(uiSel, apiSel) -> UISelection (authoritative from server)

Provider refactor (compat-preserving)
- Maintain one array: `uiSelections: UISelection[]` inside selection-provider.
- On load, map API selections to UISelection and store in uiSelections.
- Derive existing getters (allSelections, etc.) from uiSelections during migration or expose both.

Action mapping
- startDraw: add uiSel { stage: 'unstaged', isPersisted: false, dirty: true }
- updateSelection: mutate fields, dirty=true; if isPersisted && stage==='committed' -> stage='staged_edition'
- deleteSelection: if isPersisted -> stage='staged_deletion', dirty=true; else remove from uiSelections
- convertSelectionToStagedEdition(id): stage='staged_edition', dirty=true

Save/Stage
- Build operations from uiSelections:
  - Creates: isPersisted=false -> toApiCreate
  - Updates: isPersisted=true && dirty=true
    - staged_edition -> changed fields + state='staged_edition'
    - staged_deletion -> state='staged_deletion' only
    - unstaged but dirty -> policy: coerce to staged_edition for consistency
- After success: mergeServerResponse, set dirty=false, set isPersisted=true for new items. Do not set committed on save.

Commit
- Call commit endpoint.
- After success: for all uiSelections in staged_* -> stage='committed', dirty=false

Hook: useStageCommit
- Derive counts purely from uiSelections:
  - stagedCreation, stagedEdition, stagedDeletion, committed, unstaged
- canStage = any dirty === true
- canCommit = any stage in staged_* set

Legacy API bridging
- Keep getPendingChanges as an adapter derived from lifecycle state until all callers migrate.

Edge cases
- Draft deletion: remove from uiSelections (no API)
- Toggle staged_edition back to committed locally: reflect lifecycle and dirty
- After commit, ensure removed items are excluded if server deletes them

Phased rollout (PRs)
- PR1: Types and mappers; no behavior change ✅
- PR2: Provider lifecycle store; derive UI stats from lifecycle ✅
- PR3: Save/commit using lifecycle; keep legacy APIs unused
- PR4: Switch hooks/UI fully to lifecycle
- PR5: Remove legacy persisted/draft/baseline for selections and cleanup

Testing
- Unit tests for mapping, lifecycle transitions, save/commit flows, and edge cases
- Integration: verify no double counting; verify staged_deletion not marked as unstaged

