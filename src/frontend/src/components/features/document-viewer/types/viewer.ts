/**
 * Consolidated Type Definitions for Document Viewer
 * Phase 2: State Consolidation - Unified types for simplified state management
 */

import { type MinimalDocumentType, type SelectionCreateType, type SelectionType } from '@/types';

// Viewer modes
export type ViewerMode = 'pan' | 'select';

// Transform and positioning
export interface Point {
  x: number;
  y: number;
}

export interface ViewerTransform {
  pan: Point;
  zoom: number;
}

export interface DocumentSize {
  width: number;
  height: number;
}

export interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Selection state
export interface SelectionState {
  // Existing selections from the document
  existingSelections: SelectionCreateType[];
  // New selections being created/edited
  newSelections: SelectionCreateType[];
  // Currently drawing selection
  drawing: SelectionCreateType | null;
  // Drawing state
  isDrawing: boolean;
  // History for undo/redo
  history: SelectionCreateType[][];
  historyIndex: number;
}

// PDF-related state
export interface PDFState {
  // Page references for coordinate calculations
  pageRefs: Map<number, HTMLElement>;
  // Whether the PDF has been rendered and is ready for interaction
  isRendered: boolean;
  // Document container element
  documentContainer: HTMLElement | null;
}

// UI state
export interface UIState {
  // Current interaction mode
  mode: ViewerMode;
  // Whether selections are visible
  showSelections: boolean;
  // User's preferred selection visibility (persisted)
  userPreferredShowSelections: boolean;
  // Whether info panel is visible
  showInfoPanel: boolean;
  // Whether we're currently panning
  isPanning: boolean;
}

// Document navigation state
export interface NavigationState {
  // Current page index (0-based)
  currentPage: number;
  // Total number of pages
  numPages: number;
  // Whether viewing processed (redacted) version
  isViewingProcessedDocument: boolean;
}

// Consolidated viewer state
export interface ViewerState {
  // Document being viewed
  document: MinimalDocumentType | null;
  
  // Document dimensions
  documentSize: DocumentSize;
  
  // Transform state (pan, zoom)
  transform: ViewerTransform;
  
  // Navigation state
  navigation: NavigationState;
  
  // Selection state
  selections: SelectionState;
  
  // PDF state
  pdf: PDFState;
  
  // UI state
  ui: UIState;
}

// Action types for state updates
export type ViewerAction = 
  | { type: 'SET_DOCUMENT'; payload: MinimalDocumentType }
  | { type: 'SET_DOCUMENT_SIZE'; payload: DocumentSize }
  | { type: 'SET_PAN'; payload: Point }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_MODE'; payload: ViewerMode }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_NUM_PAGES'; payload: number }
  | { type: 'SET_IS_PANNING'; payload: boolean }
  | { type: 'SET_IS_RENDERED'; payload: boolean }
  | { type: 'SET_DOCUMENT_CONTAINER'; payload: HTMLElement | null }
  | { type: 'SET_SHOW_SELECTIONS'; payload: boolean }
  | { type: 'SET_SHOW_INFO_PANEL'; payload: boolean }
  | { type: 'SET_VIEWING_PROCESSED'; payload: boolean }
  | { type: 'REGISTER_PAGE'; payload: { index: number; element: HTMLElement | null } }
  | { type: 'SET_EXISTING_SELECTIONS'; payload: SelectionType[] }
  | { type: 'START_SELECTION'; payload: SelectionCreateType }
  | { type: 'UPDATE_SELECTION'; payload: SelectionCreateType }
  | { type: 'END_SELECTION' }
  | { type: 'ADD_SELECTION'; payload: SelectionCreateType }
  | { type: 'DELETE_SELECTION'; payload: number }
  | { type: 'RESET_VIEW' }
  | { type: 'UNDO_SELECTION' }
  | { type: 'REDO_SELECTION' };

// Context type for the unified viewer context
export interface ViewerContextType {
  state: ViewerState;
  dispatch: React.Dispatch<ViewerAction>;
  
  // Computed values and utilities
  getViewportBounds: () => ViewportBounds | null;
  screenToViewport: (screenPoint: Point) => Point | null;
  screenToDocument: (screenPoint: Point) => Point | null;
  documentToViewport: (documentPoint: Point) => Point | null;
  
  // High-level actions
  resetView: () => void;
  toggleMode: () => void;
  toggleSelections: () => void;
  toggleInfoPanel: () => void;
  
  // Selection actions
  startSelection: (e: React.MouseEvent, pageIndex: number) => void;
  updateSelection: (e: React.MouseEvent) => void;
  endSelection: () => void;
  deleteSelection: (index: number) => void;
  undoSelection: () => void;
  redoSelection: () => void;
}

// Selector functions for preventing unnecessary re-renders
export interface ViewerSelectors {
  selectTransform: (state: ViewerState) => ViewerTransform;
  selectNavigation: (state: ViewerState) => NavigationState;
  selectUI: (state: ViewerState) => UIState;
  selectSelections: (state: ViewerState) => SelectionState;
  selectPDF: (state: ViewerState) => PDFState;
  selectDocumentSize: (state: ViewerState) => DocumentSize;
}
