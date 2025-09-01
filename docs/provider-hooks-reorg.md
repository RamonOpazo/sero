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
- [ ] Centralize dialogs within a single owner/provider (or Actions Layer)
- [ ] Expose dialog controls via hooks (e.g., useRuleDialogs) instead of re-implementing forms
- [ ] Update empty states/menus to call hooks (no duplication of dialog logic)

Architecture outcomes
- Domain hooks only: useSelections, usePrompts, useViewportState/useViewportActions, useActions
- Composition hook: useViewer (returns composed shape for quick consumers)
- Unified provider remains the canonical entry point

Notes
- Keep changes incremental and backwards-compatible per phase.
- Prefer removal of unused code once confirmed by grep/search (no dynamic string usage).

