# Editor Layer Migration Plan

This document describes the planned reorganization of the document viewer/editor layers to simplify grouped management, data flow, and UX/UI.

Adopted naming caveat:
- The new shared container previously referred to as “render layer” is named fg-layer.
- The previous “fg-layer” is renamed actions-overlay (current actions layer).

## Goals
- Introduce a stable background reference layer sized and positioned like the current render area.
- Split the main interactive area into two panels: info-panel (left) and doc-panel (right).
- Keep selections and actions as overlays above the document rendering.
- Reduce complexity by grouping related concerns and making z-index/stacking explicit.

## Final Stacking Model (bottom → top)
1) bg-layer
- Purpose: Reference background identical to today’s rendered area background and border (dotted background).
- Positioning: Exactly matches the render area; participates in the same transform/pan as content.

2) fg-layer (new)
- Purpose: The main container that is split into two panels:
  - info-panel (left): holds all information and controls:
    - current info layer (document metadata and viewport info)
    - selections panel
    - prompts panel
  - doc-panel (right): renders the document content
- Layout: info-panel and doc-panel divide fg-layer horizontally.
- Behavior: If info-panel is hidden, doc-panel expands to fill available space.

2.a) doc-panel internals (top-to-bottom within doc-panel)
- PDF render (current RenderLayer)
- selections-overlay (current SelectionsLayer)
- actions-overlay (renamed from previous fg-layer; current ActionsLayer)

Note: “actions-overlay” sits on top of selections-overlay.

## Component Mapping (old → new)
- Background grid in UnifiedViewport → bg-layer component
- RenderLayer (PDF) → remains inside doc-panel (as-is)
- SelectionsLayer → selections-overlay (same component, over doc)
- ActionsLayer → actions-overlay (rename and place above selections)
- InfoLayer + SelectionsPanelLayer + PromptPanelLayer → consolidated inside info-panel (can be sections/tabs within a single panel)
- ViewportLayout composition → refactored to mount bg-layer and fg-layer, with overlays located under doc-panel

## Proposed DOM/React hierarchy (conceptual)
```tsx path=null start=null
<UnifiedViewport>
  {/* transform container drives translate3d(pan) only */}
  <bg-layer />

  <fg-layer>
    <info-panel />
    <doc-panel>
      <RenderLayer />           {/* PDF pages */}
      <SelectionsOverlay />     {/* on top of document */}
      <ActionsOverlay />        {/* on top of selections */}
    </doc-panel>
  </fg-layer>

  {/* Non-transform overlays that should not pan/zoom can remain outside if needed */}
  <KeyboardShortcutsDialog />
</UnifiedViewport>
```

## Layout and Sizing Notes
- bg-layer: sized to the current document render size (documentSize) and translated with pan; same rounded border and dotted background as today.
- fg-layer: a flex container splitting horizontally into info-panel and doc-panel.
- info-panel: fixed width aligned with prior panels (e.g., 60ch max); can be collapsible.
- doc-panel: grows to fill the remaining space; holds render and overlays.
- selections-overlay: absolute layer sized to documentSize inside doc-panel; hidden when viewing processed document.
- actions-overlay: absolute layer; fixed-position controls relative to doc-panel area.

## File/Module Changes
1) New components
- src/frontend/src/components/features/document-viewer/components/viewport/bg-layer.tsx
  - Renders dotted background and border; sized by documentSize; placed under the transform container.
- src/frontend/src/components/features/document-viewer/components/viewport/fg-layer.tsx
  - Splits into info-panel and doc-panel.
- src/frontend/src/components/features/document-viewer/components/viewport/info-panel.tsx
  - Consolidates InfoLayer, SelectionsPanelLayer, and PromptPanelLayer into a single panel UI. Optionally keep them as internal sections.
- src/frontend/src/components/features/document-viewer/components/viewport/doc-panel.tsx
  - Hosts RenderLayer, SelectionsOverlay, and ActionsOverlay.

2) Renames
- actions-layer.tsx → actions-overlay.tsx
- selections-layer.tsx → selections-overlay.tsx (optional; keep filename if preferred and just update import naming)

3) Existing updates
- unified-viewport.tsx: remove internal grid background block; continue to provide only the transform container (translate3d pan). Zoom remains handled via PDF render scale; pan via transform.
- components/layouts/viewport-layout.tsx: replace composition with bg-layer + fg-layer; remove direct mounting of InfoLayer, SelectionsPanelLayer, PromptPanelLayer, and mount the KeyboardShortcutsDialog where appropriate.
- components/layouts/main-layout.tsx: no structural change expected; continues to mount ViewportLayout.

4) Barrel exports
- Update index.tsx and relevant barrels to re-export new/renamed components.

## State and Behavior
- Viewport state remains the source of truth for:
  - documentSize, pan/zoom (transform), currentPage/numPages
  - info/selections/prompts panel visibility toggles
  - showSelections flag (controls selections-overlay visibility)
  - isViewingProcessedDocument (hides selections-overlay and keeps actions-overlay functional as needed)
- Info-panel visibility shrinks/grows doc-panel width. When hidden, doc-panel consumes full fg-layer width.

## Migration Steps
1) Introduce bg-layer
- Create bg-layer component with the dotted grid and border authored today within UnifiedViewport.
- Place it under the transform container so it pans consistently with the content.

2) Introduce fg-layer
- Create fg-layer component to horizontally split into info-panel and doc-panel.
- Start with info-panel visible using current width (e.g., w-[60ch]) and make it collapsible using existing viewport toggles.

3) Doc-panel overlays
- Move existing RenderLayer into doc-panel.
- Mount SelectionsLayer above RenderLayer as selections-overlay.
- Rename ActionsLayer to ActionsOverlay and mount above selections-overlay.

4) Consolidate info-panel
- Consolidate InfoLayer, SelectionsPanelLayer, and PromptPanelLayer into the new info-panel component.
- Initially, reuse existing subcomponents inside info-panel to minimize churn; later, unify into tabs/sections.

5) Refactor ViewportLayout
- Replace current layer composition with bg-layer and fg-layer.
- Keep KeyboardShortcutsDialog mounted at layout root (non-transform).

6) Simplify UnifiedViewport
- Remove the background grid/block; retain only the transform wrapper and input handling.

7) Renames and import updates
- actions-layer.tsx → actions-overlay.tsx; adjust imports/exports.
- selections-layer.tsx → selections-overlay.tsx (optional); adjust imports if renamed.

8) Verify and iterate
- Run frontend locally, verify:
  - Background matches legacy dotted style and border,
  - Info/doc split works and toggles behave correctly,
  - Selections overlay aligns with document pixels and honors showSelections and page changes,
  - Actions overlay appears above selections and behaves as before,
  - Processed/original toggle keeps behavior regarding overlays.

## Acceptance Criteria
- Visual parity for background (dotted grid + border) and document rendering.
- Functional parity for selections drawing/move/resize on doc-panel.
- Actions overlay visible and interactive above selections overlay.
- Info, selections, and prompts are accessible through the left info-panel within the same shared surface.
- Keyboard shortcuts and paging continue to work.

## Risks and Mitigations
- Overlay alignment: Ensure doc-panel uses the same documentSize basis as RenderLayer; overlay containers must match and be positioned identically.
- Z-index conflicts: Define explicit z-index scale for bg-layer (< fg-layer), and within doc-panel selections-overlay < actions-overlay.
- Incremental rollout: Start by introducing fg-layer while temporarily embedding existing panel components, then unify UI/UX later into a single info-panel experience.

