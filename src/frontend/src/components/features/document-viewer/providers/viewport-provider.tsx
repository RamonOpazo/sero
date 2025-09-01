import React, { useReducer, useCallback, useMemo, createContext, useContext } from 'react';
import { type MinimalDocumentType } from '@/types';
import type { ViewerMode, Point, ViewerTransform, DocumentSize } from "../types/viewer";

export interface NavigationState {
  currentPage: number;
  numPages: number;
  isViewingProcessedDocument: boolean;
}

export interface UIState {
  mode: ViewerMode;
  showSelections: boolean;
  userPreferredShowSelections: boolean;
  showInfoPanel: boolean;
  showSelectionsPanel: boolean;
  showPromptPanel: boolean;
  showHelpOverlay: boolean;
  isPanning: boolean;
  // Controls/workbench orchestration
  activeControlsPanel: 'document-controls' | 'workbench';
  activeWorkbenchTab: 'selections' | 'prompts';
}

export interface PDFState {
  pageRefs: Map<number, HTMLElement>;
  isRendered: boolean;
  documentContainer: HTMLElement | null;
  volatileBlob: Blob | null; // transient blob for immediate rendering
  volatileForProcessed: boolean; // whether volatileBlob corresponds to processed view
}

// Minimal viewport state - only what UnifiedViewport needs
export interface ViewportState {
  document: MinimalDocumentType | null;
  documentSize: DocumentSize;
  transform: ViewerTransform;
  navigation: NavigationState;
  pdf: PDFState;
  ui: UIState;
}

// Actions for viewport state updates
export type ViewportAction = 
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
  | { type: 'SET_SHOW_SELECTIONS_PANEL'; payload: boolean }
  | { type: 'SET_SHOW_PROMPT_PANEL'; payload: boolean }
  | { type: 'SET_VIEWING_PROCESSED'; payload: boolean }
  | { type: 'SET_VOLATILE_BLOB'; payload: { blob: Blob | null; forProcessed: boolean } }
  | { type: 'REGISTER_PAGE'; payload: { index: number; element: HTMLElement | null } }
  | { type: 'SET_ACTIVE_WORKBENCH_TAB'; payload: 'selections' | 'prompts' }
  | { type: 'RESET_VIEW' };

// Initial state
const createInitialState = (): ViewportState => ({
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
  pdf: {
    pageRefs: new Map(),
    isRendered: false,
    documentContainer: null,
    volatileBlob: null,
    volatileForProcessed: false,
  },
  ui: {
    mode: 'select',
    showSelections: true,
    userPreferredShowSelections: true,
    showInfoPanel: false,
    showSelectionsPanel: false,
    showPromptPanel: false,
    showHelpOverlay: false,
    isPanning: false,
    activeControlsPanel: 'document-controls',
    activeWorkbenchTab: 'selections',
  }
});

// State reducer
function viewportStateReducer(state: ViewportState, action: ViewportAction): ViewportState {
  switch (action.type) {
    case 'SET_DOCUMENT':
      return {
        ...state,
        document: action.payload,
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

    case 'SET_PAN':
      return {
        ...state,
        transform: {
          ...state.transform,
          pan: action.payload
        }
      };

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

    case 'SET_SHOW_SELECTIONS_PANEL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showSelectionsPanel: action.payload
        }
      };

    case 'SET_SHOW_PROMPT_PANEL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showPromptPanel: action.payload
        }
      };

    case 'SET_VIEWING_PROCESSED':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          isViewingProcessedDocument: action.payload,
        },
        // Clear volatile blob if switching away from its target view
        pdf: {
          ...state.pdf,
          volatileBlob:
            action.payload && state.pdf.volatileForProcessed
              ? state.pdf.volatileBlob
              : (!action.payload && !state.pdf.volatileForProcessed ? state.pdf.volatileBlob : null),
          volatileForProcessed:
            action.payload && state.pdf.volatileForProcessed
              ? true
              : (!action.payload && !state.pdf.volatileForProcessed ? false : state.pdf.volatileForProcessed),
        },
      };

    case 'SET_VOLATILE_BLOB':
      return {
        ...state,
        pdf: {
          ...state.pdf,
          volatileBlob: action.payload.blob,
          volatileForProcessed: action.payload.forProcessed,
        },
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

    case 'RESET_VIEW':
      return {
        ...state,
        transform: {
          pan: { x: 0, y: 0 },
          zoom: 1
        }
      };

    case 'SET_ACTIVE_WORKBENCH_TAB':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeWorkbenchTab: action.payload,
        }
      };

    default:
      return state;
  }
}

// Context type
export interface ViewportContextType {
  state: ViewportState;
  dispatch: React.Dispatch<ViewportAction>;
  
  // High-level actions
  resetView: () => void;
  toggleMode: () => void;
  toggleSelections: () => void;
  toggleInfoPanel: () => void;
  toggleSelectionsPanel: () => void;
  togglePromptPanel: () => void;
}

// Context
const ViewportContext = createContext<ViewportContextType | null>(null);

// Provider component
interface ViewportProviderProps {
  children: React.ReactNode;
  document?: MinimalDocumentType;
}

export function ViewportProvider({ children, document }: ViewportProviderProps) {
  const [state, dispatch] = useReducer(viewportStateReducer, createInitialState());
  
  // Set document when provided
  React.useEffect(() => {
    if (document && document !== state.document) {
      console.info('[ViewportProvider] Setting document', {
        docId: document.id,
        originalPtr: !!document.original_file,
        redactedPtr: !!document.redacted_file,
        files: (document.files || []).map((f: any) => ({ id: f.id, type: f.file_type, hasBlob: !!(f as any).blob })),
      });
      dispatch({ type: 'SET_DOCUMENT', payload: document });
    }
  }, [document, state.document]);

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
    const next = !state.ui.showInfoPanel;
    dispatch({ type: 'SET_SHOW_INFO_PANEL', payload: next });
    if (next) {
      // Ensure mutual exclusivity with selections panel
      dispatch({ type: 'SET_SHOW_SELECTIONS_PANEL', payload: false });
    }
  }, [state.ui.showInfoPanel]);

  const toggleSelectionsPanel = useCallback(() => {
    const next = !state.ui.showSelectionsPanel;
    dispatch({ type: 'SET_SHOW_SELECTIONS_PANEL', payload: next });
    if (next) {
      // Ensure mutual exclusivity with info and prompt panels
      dispatch({ type: 'SET_SHOW_INFO_PANEL', payload: false });
      dispatch({ type: 'SET_SHOW_PROMPT_PANEL', payload: false });
    }
  }, [state.ui.showSelectionsPanel]);

  const togglePromptPanel = useCallback(() => {
    const next = !state.ui.showPromptPanel;
    dispatch({ type: 'SET_SHOW_PROMPT_PANEL', payload: next });
    if (next) {
      // Ensure mutual exclusivity with info and selections panels
      dispatch({ type: 'SET_SHOW_INFO_PANEL', payload: false });
      dispatch({ type: 'SET_SHOW_SELECTIONS_PANEL', payload: false });
    }
  }, [state.ui.showPromptPanel]);

  // Context value
  const contextValue: ViewportContextType = useMemo(() => ({
    state,
    dispatch,
    resetView,
    toggleMode,
    toggleSelections,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
  }), [
    state,
    resetView,
    toggleMode,
    toggleSelections,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
  ]);

  return (
    <ViewportContext.Provider value={contextValue}>
      {children}
    </ViewportContext.Provider>
  );
}

// Hook to use the viewport context
export function useViewportContext(): ViewportContextType {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewportContext must be used within a ViewportProvider');
  }
  return context;
}

// Convenience hooks for specific state slices
export function useViewportState() {
  const { state, dispatch } = useViewportContext();
  
  // Convenience getters and setters
  return {
    // State
    document: state.document,
    documentSize: state.documentSize,
    zoom: state.transform.zoom,
    pan: state.transform.pan,
    mode: state.ui.mode,
    isPanning: state.ui.isPanning,
    currentPage: state.navigation.currentPage,
    numPages: state.navigation.numPages,
    isViewingProcessedDocument: state.navigation.isViewingProcessedDocument,
    showSelections: state.ui.showSelections,
    showInfoPanel: state.ui.showInfoPanel,
    showSelectionsPanel: state.ui.showSelectionsPanel,
    showPromptPanel: state.ui.showPromptPanel,
    showHelpOverlay: state.ui.showHelpOverlay,
    isRendered: state.pdf.isRendered,
    pageRefs: { current: state.pdf.pageRefs },
    documentContainer: state.pdf.documentContainer,
    volatileBlob: state.pdf.volatileBlob,
    volatileForProcessed: state.pdf.volatileForProcessed,
    
    // Actions
    dispatch,
    setVolatileBlob: useCallback((blob: Blob | null, forProcessed: boolean) => dispatch({ type: 'SET_VOLATILE_BLOB', payload: { blob, forProcessed } }), [dispatch]),
    setZoom: useCallback((zoom: number) => dispatch({ type: 'SET_ZOOM', payload: zoom }), [dispatch]),
    setPan: useCallback((pan: Point) => dispatch({ type: 'SET_PAN', payload: pan }), [dispatch]),
    setMode: useCallback((mode: ViewerMode) => dispatch({ type: 'SET_MODE', payload: mode }), [dispatch]),
    setIsPanning: useCallback((isPanning: boolean) => dispatch({ type: 'SET_IS_PANNING', payload: isPanning }), [dispatch]),
    setCurrentPage: useCallback((page: number) => dispatch({ type: 'SET_CURRENT_PAGE', payload: page }), [dispatch]),
    setNumPages: useCallback((numPages: number) => dispatch({ type: 'SET_NUM_PAGES', payload: numPages }), [dispatch]),
    setDocumentContainer: useCallback((container: HTMLElement | null) => dispatch({ type: 'SET_DOCUMENT_CONTAINER', payload: container }), [dispatch]),
    setIsRendered: useCallback((isRendered: boolean) => dispatch({ type: 'SET_IS_RENDERED', payload: isRendered }), [dispatch]),
    setShowSelections: useCallback((value: boolean | ((prevState: boolean) => boolean)) => {
      const newValue = typeof value === 'function' ? value(state.ui.showSelections) : value;
      dispatch({ type: 'SET_SHOW_SELECTIONS', payload: newValue });
    }, [dispatch, state.ui.showSelections]),
    setIsViewingProcessedDocument: useCallback((value: boolean) => dispatch({ type: 'SET_VIEWING_PROCESSED', payload: value }), [dispatch]),
    setShowInfoPanel: useCallback((value: boolean) => dispatch({ type: 'SET_SHOW_INFO_PANEL', payload: value }), [dispatch]),
    setShowSelectionsPanel: useCallback((value: boolean) => dispatch({ type: 'SET_SHOW_SELECTIONS_PANEL', payload: value }), [dispatch]),
    setShowPromptPanel: useCallback((value: boolean) => dispatch({ type: 'SET_SHOW_PROMPT_PANEL', payload: value }), [dispatch]),
    setActiveWorkbenchTab: useCallback((value: 'selections' | 'prompts') => dispatch({ type: 'SET_ACTIVE_WORKBENCH_TAB', payload: value }), [dispatch]),
    activeControlsPanel: state.ui.activeControlsPanel,
    activeWorkbenchTab: state.ui.activeWorkbenchTab,
    userPreferredShowSelections: state.ui.userPreferredShowSelections,
    resetView: useCallback(() => dispatch({ type: 'RESET_VIEW' }), [dispatch]),
    registerPage: useCallback((el: HTMLElement | null, index: number) => {
      dispatch({ type: 'REGISTER_PAGE', payload: { index, element: el } });
    }, [dispatch]),
  };
}

export function useViewportActions() {
  const { 
    resetView, 
    toggleMode, 
    toggleSelections, 
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
  } = useViewportContext();
  
  return {
    resetView,
    toggleMode,
    toggleSelections,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
  };
}
