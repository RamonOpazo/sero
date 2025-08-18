// Main component
export { default as DocumentViewer } from "./DocumentViewer";

// Layout components
export { default as MainLayout } from "./layouts/MainLayout";
export { default as ViewportLayout } from "./layouts/ViewportLayout";
export { default as TooldeckLayout } from "./layouts/TooldeckLayout";

// Control components
export * from "./tooldeck";

// Layer components
export { default as ActionsLayer } from "./viewport/ActionsLayer";
export { default as SelectionsLayer } from "./viewport/SelectionsLayer";
export { default as RenderLayer } from "./viewport/RenderLayer";
export { default as InfoLayer } from "./viewport/InfoLayer";
export { default as HelpOverlay } from "./viewport/HelpOverlay";

// Core system
export { default as UnifiedViewport } from "./core/UnifiedViewport";
export { ViewportProvider, useViewportState, useViewportActions } from "./core/ViewportState";
export { SelectionProvider, useSelections } from './core/SelectionProvider';
export { PromptProvider, usePrompts } from './core/PromptProvider';

// Domain Managers (new configuration-driven system)
export { 
  createPromptManager, 
  createSelectionManager,
  type PromptManagerInstance,
  type SelectionManagerInstance
} from './managers';

// Utilities
export { screenToViewport, screenToDocument, documentToViewport, clampPan, calculateCenterFit } from "./core/CoordinateSystem";

// Hooks
export { useSelectionLoader } from './hooks/useSelectionLoader';
export { useDocumentViewerState } from './useDocumentViewerState';
export { usePDFPages } from './usePDFPages';

// Types
export type { Selection, SelectionCreateType } from "./managers/types/viewer";
