export * from "./DocumentViewer";
export * from "./Layers";
export * from "./layers/ActionsLayer";
export * from "./Controls";
export * from "./SelectionsList";
export * from "./PromptsList";

// New unified architecture exports
export * from "./core/UnifiedViewport";
export { ViewportProvider, useViewportState, useViewportActions } from "./core/ViewportState";
export * from "./layers/RenderLayer";
export { default as SelectionsLayerNew } from "./layers/SelectionsLayerNew";
export * from "./layers/InfoLayer";
// Export coordinate system utils but not types to avoid conflicts
export { screenToViewport, screenToDocument, documentToViewport, clampPan, calculateCenterFit } from "./core/CoordinateSystem";

// New selection management system
export { default as SelectionManager } from './core/SelectionManager';
export { SelectionProvider, useSelections } from './core/SelectionProvider';
export type { SelectionManagerState, SelectionManagerAction } from './core/SelectionManager';

// Export specific types from viewer types (avoid conflicts with ViewportState)
export type { Selection, SelectionCreateType } from "./types/viewer";
