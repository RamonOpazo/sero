
# Document Viewer Refactoring Plan

This document outlines the refactoring plan for the document-viewer feature. The goal of this refactoring is to improve the overall structure of the feature, making it more modular, easier to understand, and more maintainable.

## Current Structure

The current structure of the document-viewer feature is a mix of providers, hooks, and components. The providers are responsible for managing the state of the feature, the hooks are responsible for providing the state to the components, and the components are responsible for rendering the UI.

The main problem with the current structure is that there is no clear separation of concerns. The providers are responsible for both managing the state and for the business logic of the feature. This makes the providers difficult to understand and maintain.

## Proposed Structure (DRY-first, single source of truth)

The proposed structure is based on the following principles:

*   **Clear Separation of Concerns**: Each hook and provider will have a single, well-defined responsibility. This will make the code easier to understand, test, and maintain.
*   **Domain-Driven Structure**: The new structure will be organized by domain, with each domain having its own set of hooks and providers. This will make it easier to reason about the code and to add new features in the future.
*   **Improved Data Flow**: The new structure will have a clear and predictable data flow, with a single source of truth for each piece of data. This will make it easier to debug the code and to prevent inconsistencies.

## Final File Structure (no duplicated responsibilities)

Here is the final file structure that I propose for the document-viewer feature:

```
src/frontend/src/features/document-viewer/
├── components/
│   ├── ...
├── hooks/
│   ├── use-document-events.ts    # centralize keyboard/mouse shortcuts
│   ├── use-document-viewer.ts    # composed selector hook (canonical)
│   ├── use-prompts.ts            # thin facade over PromptProvider
│   ├── use-selections.ts         # thin facade over SelectionProvider
│   └── use-viewport.ts           # thin facade over ViewportProvider
├── providers/
│   ├── document-viewer-provider.tsx
│   ├── prompts-provider.tsx
│   ├── selections-provider.tsx
│   └── viewport-provider.tsx
└── ...
```

## Single Source of Truth commitments

- SelectionProvider: selection state, initial load (fetch), mutations, lifecycle, history
- PromptProvider: prompt state, load/save, CRUD
- ViewportProvider: zoom/pan/page state and commands
- DialogsProvider (TBD in Phase 3): dialog visibility/state for rules and selections
- Actions (useActions): orchestrations that call providers; no local state duplication
- Composed hook: use-document-viewer (a.k.a. useDocumentViewer) returns read-only composition; no shadow state

## Document List View

Here is a detailed breakdown of the final files and their domains:

| File | Domain | Description |
| :--- | :--- | :--- |
| `document-viewer-provider.tsx` | Document Viewer | Provides a unified context for the entire document-viewer feature, composing the other providers. |
| `prompts-provider.tsx` | Prompts | Manages the state of prompts, including creating, editing, and deleting them. |
| `selections-provider.tsx` | Selections | Manages the state of selections, including creating, editing, and deleting them. |
| `viewport-provider.tsx` | Viewport | Manages the state of the viewport, including zoom, pan, and page navigation. |
| `use-document-data.ts` | Document Data | Fetches and manages the document data, including the original and redacted files. |
| `use-document-events.ts` | Document Events | Manages document-level events, such as keyboard shortcuts and mouse events. |
| `use-document-viewer.ts` | Document Viewer | The main hook for the document-viewer feature, composing the other hooks and providing a unified API. |
| `use-prompts.ts` | Prompts | Provides a set of methods for interacting with the prompts state, including creating, editing, and deleting prompts. |
| `use-selections.ts` | Selections | Provides a set of methods for interacting with the selections state, including creating, editing, and deleting selections. |
| `use-viewport.ts` | Viewport | Provides a set of methods for interacting with the viewport state, including zooming, panning, and navigating pages. |

## Implementation Plan (updated for DRY)

1) Keep current physical paths to minimize churn; align naming via exports (no duplicate implementations).
2) Canonical composed hook: useDocumentViewer; provide useViewer as temporary alias and plan migration.
3) Do not reintroduce use-document-data for selections/prompts; providers remain the single owners of fetching/mutations.
4) Introduce use-document-events to consolidate shortcuts, removing ad-hoc listeners from scattered components.
5) Centralize dialogs under a DialogsProvider and expose useRuleDialogs/useSelectionDialogs hooks; remove duplicate inline FormConfirmationDialog usages.
6) After migration, optionally move folder to features/document-viewer in one PR to avoid long-running divergence.

The refactoring will be implemented in the following steps:

1.  Create the new directory structure.
2.  Create the new `document-viewer-provider.tsx` file.
3.  Move the existing logic from the other providers to the new hooks.
4.  Update the components to use the new hooks.
5.  Rename the existing `use-viewer.ts` hook to `use-document-viewer.ts` and update its implementation to match the new structure.
6.  Remove the old providers and hooks.
