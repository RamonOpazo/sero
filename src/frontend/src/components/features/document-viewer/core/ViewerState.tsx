/**
 * Unified Viewer State Management
 * Phase 2: State Consolidation - Single source of truth for all viewer state
 */

import React, { useReducer, useCallback, useMemo, createContext, useContext } from 'react';
import { type MinimalDocumentType } from '@/types';
import { 
  type ViewerState, 
  type ViewerAction, 
  type ViewerContextType,
  type ViewerSelectors,
  type Point,
  type SelectionHistorySnapshot
} from '../types/viewer';
import { 
  screenToViewport,
  screenToDocument as screenToDocumentUtil,
  documentToViewport as documentToViewportUtil,
} from './CoordinateSystem';

// Helper function to create a selection history snapshot
const createSelectionSnapshot = (state: ViewerState): SelectionHistorySnapshot => ({
  existingSelections: [...state.selections.existingSelections],
  newSelections: [...state.selections.newSelections]
});

// Helper function to add a history entry
const addHistoryEntry = (state: ViewerState): ViewerState => {
  const snapshot = createSelectionSnapshot(state);
  const newHistory = state.selections.history.slice(0, state.selections.historyIndex + 1);
  newHistory.push(snapshot);
  
  return {
    ...state,
    selections: {
      ...state.selections,
      history: newHistory,
      historyIndex: newHistory.length - 1
    }
  };
};

// Initial state
const createInitialState = (): ViewerState => ({
  document: null,
  documentSize: { width: 800, height: 600 },
  transform: {
    pan: { x: 0, y: 0 },
    zoom: 1
  },
  navigation: {
    currentPage: 0,
    numPages: 0,
    isViewingProcessedDocument: false
  },
  selections: {
    existingSelections: [],
    newSelections: [],
    drawing: null,
    isDrawing: false,
    history: [],
    historyIndex: -1
  },
  pdf: {
    pageRefs: new Map(),
    isRendered: false,
    documentContainer: null
  },
  ui: {
    mode: 'select',
    showSelections: true,
    userPreferredShowSelections: true,
    showInfoPanel: false,
    showHelpOverlay: false,
    isPanning: false
  }
});

// State reducer
function viewerStateReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'SET_DOCUMENT':
      return {
        ...state,
        document: action.payload,
        selections: {
          ...state.selections,
          existingSelections: [], // MinimalDocumentType doesn't have selections
          // Keep test selection for debugging - in production this would be []
          newSelections: state.selections.newSelections.length > 0 ? state.selections.newSelections : [],
          drawing: null,
          isDrawing: false
        },
        navigation: {
          ...state.navigation,
          currentPage: 0,
          numPages: 0
        },
        transform: {
          pan: { x: 0, y: 0 },
          zoom: 1
        }
      };

    case 'SET_DOCUMENT_SIZE':
      return {
        ...state,
        documentSize: action.payload
      };

    case 'SET_PAN': {
      return {
        ...state,
        transform: {
          ...state.transform,
          pan: action.payload
        }
      };
    }

    case 'SET_ZOOM':
      return {
        ...state,
        transform: {
          ...state.transform,
          zoom: Math.max(0.5, Math.min(3, action.payload))
        }
      };

    case 'SET_MODE':
      return {
        ...state,
        ui: {
          ...state.ui,
          mode: action.payload,
          // Auto-show selections when entering select mode
          showSelections: action.payload === 'select' ? true : state.ui.userPreferredShowSelections
        }
      };

    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          currentPage: Math.max(0, Math.min(state.navigation.numPages - 1, action.payload))
        },
        pdf: {
          ...state.pdf,
          isRendered: false // Reset render state when page changes
        }
      };

    case 'SET_NUM_PAGES':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          numPages: action.payload
        }
      };

    case 'SET_IS_PANNING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isPanning: action.payload
        }
      };

    case 'SET_IS_RENDERED':
      return {
        ...state,
        pdf: {
          ...state.pdf,
          isRendered: action.payload
        }
      };

    case 'SET_DOCUMENT_CONTAINER':
      return {
        ...state,
        pdf: {
          ...state.pdf,
          documentContainer: action.payload
        }
      };

    case 'SET_SHOW_SELECTIONS':
      return {
        ...state,
        ui: {
          ...state.ui,
          showSelections: action.payload,
          userPreferredShowSelections: action.payload
        }
      };

    case 'SET_SHOW_INFO_PANEL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showInfoPanel: action.payload
        }
      };

    case 'SET_SHOW_HELP_OVERLAY':
      return {
        ...state,
        ui: {
          ...state.ui,
          showHelpOverlay: action.payload
        }
      };

    case 'SET_VIEWING_PROCESSED':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          isViewingProcessedDocument: action.payload
        }
      };

    case 'REGISTER_PAGE': {
      const newPageRefs = new Map(state.pdf.pageRefs);
      if (action.payload.element) {
        newPageRefs.set(action.payload.index, action.payload.element);
      } else {
        newPageRefs.delete(action.payload.index);
      }
      return {
        ...state,
        pdf: {
          ...state.pdf,
          pageRefs: newPageRefs
        }
      };
    }

    case 'SET_EXISTING_SELECTIONS':
      // Keep SelectionType as-is since existingSelections should include id for updates
      return {
        ...state,
        selections: {
          ...state.selections,
          existingSelections: action.payload
        }
      };

    case 'UPDATE_EXISTING_SELECTION': {
      const { index, selection } = action.payload;
      const updatedExistingSelections = [...state.selections.existingSelections];
      if (index >= 0 && index < updatedExistingSelections.length) {
        // Merge the selection update with existing metadata (preserve id, created_at, etc.)
        const existingSelection = updatedExistingSelections[index];
        updatedExistingSelections[index] = {
          ...existingSelection,
          ...selection,
          // Always preserve these metadata fields from the existing selection
          id: existingSelection.id,
          created_at: existingSelection.created_at,
          updated_at: new Date().toISOString(), // Update the timestamp
        };
      }
      
      const stateWithUpdatedSelection = {
        ...state,
        selections: {
          ...state.selections,
          existingSelections: updatedExistingSelections
        }
      };

      // Add history entry with both existing and new selections
      return addHistoryEntry(stateWithUpdatedSelection);
    }

    case 'UPDATE_EXISTING_SELECTION_NO_HISTORY': {
      const { index, selection } = action.payload;
      const updatedExistingSelections = [...state.selections.existingSelections];
      if (index >= 0 && index < updatedExistingSelections.length) {
        // Merge the selection update with existing metadata (preserve id, created_at, etc.)
        const existingSelection = updatedExistingSelections[index];
        updatedExistingSelections[index] = {
          ...existingSelection,
          ...selection,
          // Always preserve these metadata fields from the existing selection
          id: existingSelection.id,
          created_at: existingSelection.created_at,
          updated_at: new Date().toISOString(), // Update the timestamp
        };
      }
      
      // Update without creating history entry
      return {
        ...state,
        selections: {
          ...state.selections,
          existingSelections: updatedExistingSelections
        }
      };
    }

    case 'UPDATE_NEW_SELECTION': {
      const { index, selection } = action.payload;
      const updatedNewSelections = [...state.selections.newSelections];
      if (index >= 0 && index < updatedNewSelections.length) {
        updatedNewSelections[index] = selection;
      }
      
      return {
        ...state,
        selections: {
          ...state.selections,
          newSelections: updatedNewSelections
        }
      };
    }

    case 'UPDATE_NEW_SELECTION_NO_HISTORY': {
      const { index, selection } = action.payload;
      const updatedNewSelections = [...state.selections.newSelections];
      if (index >= 0 && index < updatedNewSelections.length) {
        updatedNewSelections[index] = selection;
      }
      
      // Update without creating history entry
      return {
        ...state,
        selections: {
          ...state.selections,
          newSelections: updatedNewSelections
        }
      };
    }

    case 'START_SELECTION':
      return {
        ...state,
        selections: {
          ...state.selections,
          drawing: action.payload,
          isDrawing: true
        }
      };

    case 'UPDATE_SELECTION':
      return {
        ...state,
        selections: {
          ...state.selections,
          drawing: action.payload
        }
      };

    case 'END_SELECTION': {
      const { drawing } = state.selections;
      if (!drawing || Math.abs(drawing.width) < 0.01 || Math.abs(drawing.height) < 0.01) {
        // Selection too small, discard
        return {
          ...state,
          selections: {
            ...state.selections,
            drawing: null,
            isDrawing: false
          }
        };
      }

      // Add to new selections
      const newSelections = [...state.selections.newSelections, drawing];
      const stateWithNewSelection = {
        ...state,
        selections: {
          ...state.selections,
          newSelections,
          drawing: null,
          isDrawing: false
        }
      };

      // Add history entry with both existing and new selections
      return addHistoryEntry(stateWithNewSelection);
    }

    case 'ADD_SELECTION': {
      const newSelections = [...state.selections.newSelections, action.payload];
      const stateWithNewSelection = {
        ...state,
        selections: {
          ...state.selections,
          newSelections
        }
      };

      // Add history entry with both existing and new selections
      return addHistoryEntry(stateWithNewSelection);
    }

    case 'DELETE_SELECTION': {
      const newSelections = [...state.selections.newSelections];
      newSelections.splice(action.payload, 1);
      
      const stateWithDeletedSelection = {
        ...state,
        selections: {
          ...state.selections,
          newSelections
        }
      };

      // Add history entry with both existing and new selections
      return addHistoryEntry(stateWithDeletedSelection);
    }

    case 'REMOVE_EXISTING_SELECTION': {
      const updatedExistingSelections = [...state.selections.existingSelections];
      updatedExistingSelections.splice(action.payload.index, 1);
      
      const stateWithRemovedSelection = {
        ...state,
        selections: {
          ...state.selections,
          existingSelections: updatedExistingSelections
        }
      };

      // Add history entry with both existing and new selections
      return addHistoryEntry(stateWithRemovedSelection);
    }

    case 'RESET_VIEW':
      return {
        ...state,
        transform: {
          pan: { x: 0, y: 0 },
          zoom: 1
        }
      };

    case 'UNDO_SELECTION': {
      if (state.selections.historyIndex <= 0) {
        return state; // Nothing to undo
      }
      
      const newIndex = state.selections.historyIndex - 1;
      const snapshot = state.selections.history[newIndex];
      
      if (!snapshot) {
        return state; // Invalid history state
      }
      
      return {
        ...state,
        selections: {
          ...state.selections,
          existingSelections: [...snapshot.existingSelections],
          newSelections: [...snapshot.newSelections],
          historyIndex: newIndex
        }
      };
    }

    case 'REDO_SELECTION': {
      if (state.selections.historyIndex >= state.selections.history.length - 1) {
        return state; // Nothing to redo
      }
      
      const newIndex = state.selections.historyIndex + 1;
      const snapshot = state.selections.history[newIndex];
      
      if (!snapshot) {
        return state; // Invalid history state
      }
      
      return {
        ...state,
        selections: {
          ...state.selections,
          existingSelections: [...snapshot.existingSelections],
          newSelections: [...snapshot.newSelections],
          historyIndex: newIndex
        }
      };
    }

    default:
      return state;
  }
}

// Selector functions to prevent unnecessary re-renders
const createSelectors = (): ViewerSelectors => ({
  selectTransform: (state: ViewerState) => state.transform,
  selectNavigation: (state: ViewerState) => state.navigation,
  selectUI: (state: ViewerState) => state.ui,
  selectSelections: (state: ViewerState) => state.selections,
  selectPDF: (state: ViewerState) => state.pdf,
  selectDocumentSize: (state: ViewerState) => state.documentSize,
});

// Context
const ViewerContext = createContext<ViewerContextType | null>(null);

// Provider component
interface ViewerProviderProps {
  children: React.ReactNode;
  document?: MinimalDocumentType;
}

export function UnifiedViewerProvider({ children, document }: ViewerProviderProps) {
  const [state, dispatch] = useReducer(viewerStateReducer, createInitialState());
  
  // Set document when provided
  React.useEffect(() => {
    if (document && document !== state.document) {
      dispatch({ type: 'SET_DOCUMENT', payload: document });
    }
  }, [document, state.document]);

  // Viewport utilities
  const getViewportBounds = useCallback(() => {
    if (!state.pdf.documentContainer) return null;
    
    // For unified viewport, we need to get the viewport container bounds
    const viewportElement = state.pdf.documentContainer.closest('.unified-viewport');
    if (!viewportElement) return null;
    
    const rect = viewportElement.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, [state.pdf.documentContainer]);

  const screenToViewportCoords = useCallback((screenPoint: Point) => {
    const bounds = getViewportBounds();
    if (!bounds) return null;
    return screenToViewport(screenPoint, bounds);
  }, [getViewportBounds]);

  const screenToDocumentCoords = useCallback((screenPoint: Point) => {
    const bounds = getViewportBounds();
    if (!bounds) return null;
    return screenToDocumentUtil(screenPoint, bounds, state.transform, state.documentSize);
  }, [getViewportBounds, state.transform, state.documentSize]);

  const documentToViewportCoords = useCallback((documentPoint: Point) => {
    return documentToViewportUtil(documentPoint, state.transform, state.documentSize);
  }, [state.transform, state.documentSize]);

  // High-level actions
  const resetView = useCallback(() => {
    dispatch({ type: 'RESET_VIEW' });
  }, []);

  const toggleMode = useCallback(() => {
    const newMode = state.ui.mode === 'pan' ? 'select' : 'pan';
    dispatch({ type: 'SET_MODE', payload: newMode });
  }, [state.ui.mode]);

  const toggleSelections = useCallback(() => {
    dispatch({ type: 'SET_SHOW_SELECTIONS', payload: !state.ui.showSelections });
  }, [state.ui.showSelections]);

  const toggleInfoPanel = useCallback(() => {
    dispatch({ type: 'SET_SHOW_INFO_PANEL', payload: !state.ui.showInfoPanel });
  }, [state.ui.showInfoPanel]);

  const toggleHelpOverlay = useCallback(() => {
    dispatch({ type: 'SET_SHOW_HELP_OVERLAY', payload: !state.ui.showHelpOverlay });
  }, [state.ui.showHelpOverlay]);

  // Selection actions
  const startSelection = useCallback((e: React.MouseEvent, pageIndex: number) => {
    const documentPoint = screenToDocumentCoords({ x: e.clientX, y: e.clientY });
    if (!documentPoint || !state.document) return;

    const selection = {
      x: documentPoint.x,
      y: documentPoint.y,
      width: 0,
      height: 0,
      page_number: pageIndex + 1,
      document_id: state.document.id,
    };

    dispatch({ type: 'START_SELECTION', payload: selection });
  }, [screenToDocumentCoords, state.document]);

  const updateSelection = useCallback((e: React.MouseEvent) => {
    if (!state.selections.drawing) return;

    const documentPoint = screenToDocumentCoords({ x: e.clientX, y: e.clientY });
    if (!documentPoint) return;

    const updatedSelection = {
      ...state.selections.drawing,
      width: documentPoint.x - state.selections.drawing.x,
      height: documentPoint.y - state.selections.drawing.y,
    };

    dispatch({ type: 'UPDATE_SELECTION', payload: updatedSelection });
  }, [screenToDocumentCoords, state.selections.drawing]);

  const endSelection = useCallback(() => {
    dispatch({ type: 'END_SELECTION' });
  }, []);

  const deleteSelection = useCallback((index: number) => {
    dispatch({ type: 'DELETE_SELECTION', payload: index });
  }, []);

  const undoSelection = useCallback(() => {
    dispatch({ type: 'UNDO_SELECTION' });
  }, []);

  const redoSelection = useCallback(() => {
    dispatch({ type: 'REDO_SELECTION' });
  }, []);

  // Context value
  const contextValue: ViewerContextType = useMemo(() => ({
    state,
    dispatch,
    getViewportBounds,
    screenToViewport: screenToViewportCoords,
    screenToDocument: screenToDocumentCoords,
    documentToViewport: documentToViewportCoords,
    resetView,
    toggleMode,
    toggleSelections,
    toggleInfoPanel,
    toggleHelpOverlay,
    startSelection,
    updateSelection,
    endSelection,
    deleteSelection,
    undoSelection,
    redoSelection,
  }), [
    state,
    getViewportBounds,
    screenToViewportCoords,
    screenToDocumentCoords,
    documentToViewportCoords,
    resetView,
    toggleMode,
    toggleSelections,
    toggleInfoPanel,
    toggleHelpOverlay,
    startSelection,
    updateSelection,
    endSelection,
    deleteSelection,
    undoSelection,
    redoSelection,
  ]);

  return (
    <ViewerContext.Provider value={contextValue}>
      {children}
    </ViewerContext.Provider>
  );
}

// Hook to use the unified viewer context
export function useUnifiedViewerContext(): ViewerContextType {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error('useUnifiedViewerContext must be used within a UnifiedViewerProvider');
  }
  return context;
}

// Selector hooks for fine-grained subscriptions
export function useViewerSelector<T>(selector: (state: ViewerState) => T): T {
  const { state } = useUnifiedViewerContext();
  return useMemo(() => selector(state), [selector, state]);
}

export const selectors = createSelectors();
