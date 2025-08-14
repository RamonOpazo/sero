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
  type Point 
} from '../types/viewer';
import { 
  screenToViewport,
  screenToDocument as screenToDocumentUtil,
  documentToViewport as documentToViewportUtil,
} from './CoordinateSystem';

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
          newSelections: [],
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

      // Add to new selections and history
      const newSelections = [...state.selections.newSelections, drawing];
      const newHistory = state.selections.history.slice(0, state.selections.historyIndex + 1);
      newHistory.push([...newSelections]);

      return {
        ...state,
        selections: {
          ...state.selections,
          newSelections,
          drawing: null,
          isDrawing: false,
          history: newHistory,
          historyIndex: newHistory.length - 1
        }
      };
    }

    case 'ADD_SELECTION': {
      const newSelections = [...state.selections.newSelections, action.payload];
      const newHistory = state.selections.history.slice(0, state.selections.historyIndex + 1);
      newHistory.push([...newSelections]);

      return {
        ...state,
        selections: {
          ...state.selections,
          newSelections,
          history: newHistory,
          historyIndex: newHistory.length - 1
        }
      };
    }

    case 'DELETE_SELECTION': {
      const newSelections = [...state.selections.newSelections];
      newSelections.splice(action.payload, 1);
      
      const newHistory = state.selections.history.slice(0, state.selections.historyIndex + 1);
      newHistory.push([...newSelections]);

      return {
        ...state,
        selections: {
          ...state.selections,
          newSelections,
          history: newHistory,
          historyIndex: newHistory.length - 1
        }
      };
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
      const newIndex = Math.max(0, state.selections.historyIndex - 1);
      const newSelections = state.selections.history[newIndex] || [];
      
      return {
        ...state,
        selections: {
          ...state.selections,
          newSelections: [...newSelections],
          historyIndex: newIndex
        }
      };
    }

    case 'REDO_SELECTION': {
      const newIndex = Math.min(state.selections.history.length - 1, state.selections.historyIndex + 1);
      const newSelections = state.selections.history[newIndex] || [];
      
      return {
        ...state,
        selections: {
          ...state.selections,
          newSelections: [...newSelections],
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
