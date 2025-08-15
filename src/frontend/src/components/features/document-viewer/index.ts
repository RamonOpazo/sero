export * from "./DocumentViewer";
export * from "./Layers";
export * from "./layers/ActionsLayer";
export * from "./Controls";
export * from "./SelectionsList";
export * from "./PromptsList";

// New unified architecture exports
export * from "./core/UnifiedViewport";
export * from "./core/ViewerState";
export * from "./core/EventHandler";
export * from "./layers/RenderLayer";
export * from "./layers/SelectionsLayer";
export * from "./layers/InfoLayer";
export * from "./hooks/useViewerState";
// Export coordinate system utils but not types to avoid conflicts
export { screenToViewport, screenToDocument, documentToViewport, clampPan, calculateCenterFit } from "./core/CoordinateSystem";

// New selection management system
export { default as SelectionManager } from './core/SelectionManager';
export { SelectionProvider, useSelections } from './core/SelectionProvider';
export type { SelectionManagerState, SelectionManagerAction } from './core/SelectionManager';

// Export viewer types
export * from "./types/viewer";
