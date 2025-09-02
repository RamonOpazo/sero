# Provider & Hooks Reorganization Plan

Status: In progress
Owner: Document Viewer (frontend)
Scope: src/frontend/src/components/features/document-viewer

Goals
- Provide a single, obvious provider entry (UnifiedDocumentViewerProvider) and coherent domain hooks.
- Reduce indirection and remove legacy/unused code.
- Eliminate one-off loader/fetch hooks that duplicate provider responsibilities.
- Offer a simple composed hook (useViewer) for common consumers.

Phases

Phase 1 — Non-breaking cleanup (this PR)
- [x] Remove legacy/unused: useDocumentPrompts (unused across repo)
- [x] Deprecate useSelectionLoader with a banner; keep behavior intact
- [x] Add composed convenience hook: hooks/use-viewer.ts
- [x] Verify/align barrel exports (providers/index.ts, hooks/index.ts)
- [x] Build to verify; commit

Phase 2 — Fold selection loading into SelectionProvider
- [x] Move initial selections load (currently in useSelectionLoader) into SelectionProvider mount effect
- [x] Remove useSelectionLoader and useDocumentSelections (no longer needed)
- [x] Adjust DocumentViewer entry (index.tsx) to stop calling useSelectionLoader

Phase 3 — Dialog access (optional, recommended)

Objectives
- Single source of truth for dialogs (no duplicate inline dialogs)
- Open dialogs via hooks; UI surfaces (menus, empty states) just call hooks
- Keep forms and validation in one place

Plan
- [ ] Introduce Dialogs ownership (choose one):
  - [ ] A lightweight DialogsProvider mounted in UnifiedDocumentViewerProvider
  - [ ] Or extend existing ActionsLayer to own dialogs but expose control via a context/hook
- [ ] Expose hooks:
  - [ ] useRuleDialogs: { openAddRuleDialog, openEditRuleDialog(id), openClearAllRulesDialog }
  - [ ] useSelectionDialogs (optional): { openStageAllDialog, openCommitAllDialog, openClearPageDialog, openClearAllDialog }
- [ ] Refactor callers:
  - [ ] PromptList empty-state uses useRuleDialogs().openAddRuleDialog
  - [ ] Menus (actions-config) invoke dialog hooks via useActions or direct hooks
  - [ ] Remove duplicated FormConfirmationDialog usages from scattered components
- [ ] Acceptance criteria:
  - [ ] No component duplicates rule creation/clear dialogs
  - [ ] Hooks are the only way to trigger dialogs; actual dialog implementations are centralized

Architecture outcomes
- Single source of truth per domain:
  - SelectionProvider owns selection state, loading, mutations
  - PromptProvider owns prompt state, loading, mutations
  - ViewportProvider owns viewport state and commands
  - DialogsProvider (Phase 3) owns dialog visibility/state
- Domain hooks are thin facades over providers: useSelections, usePrompts, useViewportState/useViewportActions, useActions
- Composition hook: useDocumentViewer (preferred) with useViewer as temporary alias
- Unified provider remains the canonical entry point (composes all providers)

Notes
- Keep changes incremental and backwards-compatible per phase.
- Prefer removal of unused code once confirmed by grep/search (no dynamic string usage).

