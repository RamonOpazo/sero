/**
 * Unified Viewer State Hook
 * Phase 2: State Consolidation - Replaces useDocumentViewerState, usePDFContext, and useSelection
 */

import { useCallback } from 'react';
import { useUnifiedViewerContext, useViewerSelector, selectors } from '../core/ViewerState';
import type { ViewerMode, Point } from '../types/viewer';

/**
 * Main hook that provides all viewer functionality
 * Replaces the previous separate hooks
 */
export function useViewerState() {
  const context = useUnifiedViewerContext();
  
  // Stabilize the registerPage function to prevent infinite re-renders
  const registerPage = useCallback((el: HTMLElement | null, index: number) => {
    context.dispatch({ type: 'REGISTER_PAGE', payload: { index, element: el } });
  }, [context.dispatch]);
  
  // Stabilize other action functions
  const setZoom = useCallback((zoom: number) => {
    context.dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, [context.dispatch]);
  
  const setPan = useCallback((pan: Point) => {
    context.dispatch({ type: 'SET_PAN', payload: pan });
  }, [context.dispatch]);
  
  const setCurrentPage = useCallback((page: number) => {
    context.dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, [context.dispatch]);
  
  const setNumPages = useCallback((numPages: number) => {
    context.dispatch({ type: 'SET_NUM_PAGES', payload: numPages });
  }, [context.dispatch]);
  
  const setMode = useCallback((mode: ViewerMode) => {
    context.dispatch({ type: 'SET_MODE', payload: mode });
  }, [context.dispatch]);
  
  const setIsPanning = useCallback((isPanning: boolean) => {
    context.dispatch({ type: 'SET_IS_PANNING', payload: isPanning });
  }, [context.dispatch]);
  
  const setShowSelections = useCallback((show: boolean) => {
    context.dispatch({ type: 'SET_SHOW_SELECTIONS', payload: show });
  }, [context.dispatch]);
  
  const setIsRendered = useCallback((isRendered: boolean) => {
    context.dispatch({ type: 'SET_IS_RENDERED', payload: isRendered });
  }, [context.dispatch]);
  
  const setDocumentContainer = useCallback((container: HTMLElement | null) => {
    context.dispatch({ type: 'SET_DOCUMENT_CONTAINER', payload: container });
  }, [context.dispatch]);
  
  const triggerUpdate = useCallback(() => {
    // In the old system, this forced re-renders. In the new system, state changes automatically trigger re-renders
    // This method is kept for compatibility but may be a no-op
  }, []);
  
  return {
    // Direct access to context for complex operations
    ...context,
    
    // Convenience getters for common state access
    get document() { return context.state.document; },
    get documentSize() { return context.state.documentSize; },
    get transform() { return context.state.transform; },
    get navigation() { return context.state.navigation; },
    get selections() { return context.state.selections; },
    get pdf() { return context.state.pdf; },
    get ui() { return context.state.ui; },
    
    // Legacy compatibility methods (for easier migration)
    get zoom() { return context.state.transform.zoom; },
    get pan() { return context.state.transform.pan; },
    get currentPage() { return context.state.navigation.currentPage; },
    get numPages() { return context.state.navigation.numPages; },
    get mode() { return context.state.ui.mode; },
    get isPanning() { return context.state.ui.isPanning; },
    get showSelections() { return context.state.ui.showSelections; },
    get showInfoPanel() { return context.state.ui.showInfoPanel; },
    get isRendered() { return context.state.pdf.isRendered; },
    get pageRefs() { return { current: context.state.pdf.pageRefs }; },
    get documentContainer() { return context.state.pdf.documentContainer; },
    
    // Stabilized action methods
    setZoom,
    setPan,
    setCurrentPage,
    setNumPages,
    setMode,
    setIsPanning,
    setShowSelections,
    setIsRendered,
    setDocumentContainer,
    
    // PDF-related methods (replaces usePDFContext)
    registerPage,
    triggerUpdate,
    
    // Selection methods (replaces useSelection)
    get existingSelections() { return context.state.selections.existingSelections; },
    get newSelections() { return context.state.selections.newSelections; },
    get drawing() { return context.state.selections.drawing; },
    get isDrawing() { return context.state.selections.isDrawing; },
    startDraw: context.startSelection,
    updateDraw: context.updateSelection,
    endDraw: context.endSelection,
    deleteNewSelection: context.deleteSelection,
    deleteSelection: context.deleteSelection,
  };
}

/**
 * Hook for components that only need transform state
 * Prevents unnecessary re-renders when other state changes
 */
export function useViewerTransform() {
  return useViewerSelector(selectors.selectTransform);
}

/**
 * Hook for components that only need navigation state
 * Prevents unnecessary re-renders when other state changes
 */
export function useViewerNavigation() {
  return useViewerSelector(selectors.selectNavigation);
}

/**
 * Hook for components that only need UI state
 * Prevents unnecessary re-renders when other state changes
 */
export function useViewerUI() {
  return useViewerSelector(selectors.selectUI);
}

/**
 * Hook for components that only need selection state
 * Prevents unnecessary re-renders when other state changes
 */
export function useViewerSelections() {
  return useViewerSelector(selectors.selectSelections);
}

/**
 * Hook for components that only need PDF state
 * Prevents unnecessary re-renders when other state changes
 */
export function useViewerPDF() {
  return useViewerSelector(selectors.selectPDF);
}

/**
 * Hook for components that only need document size
 * Prevents unnecessary re-renders when other state changes
 */
export function useViewerDocumentSize() {
  return useViewerSelector(selectors.selectDocumentSize);
}

/**
 * Hook that provides coordinate transformation utilities
 * Replaces coordinate-related functionality scattered across components
 */
export function useCoordinates() {
  const { 
    getViewportBounds, 
    screenToViewport, 
    screenToDocument, 
    documentToViewport 
  } = useUnifiedViewerContext();
  
  return {
    getViewportBounds,
    screenToViewport,
    screenToDocument,
    documentToViewport,
  };
}

/**
 * Hook for viewer actions - provides all action methods
 * Useful for components that need to trigger state changes
 */
export function useViewerActions() {
  const { 
    dispatch,
    resetView, 
    toggleMode, 
    toggleSelections, 
    toggleInfoPanel,
    startSelection,
    updateSelection,
    endSelection,
    deleteSelection,
    undoSelection,
    redoSelection
  } = useUnifiedViewerContext();
  
  return {
    dispatch,
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
    
    // Direct dispatch helpers for common actions
    setZoom: useCallback((zoom: number) => dispatch({ type: 'SET_ZOOM', payload: zoom }), [dispatch]),
    setPan: useCallback((pan: Point) => dispatch({ type: 'SET_PAN', payload: pan }), [dispatch]),
    setMode: useCallback((mode: ViewerMode) => dispatch({ type: 'SET_MODE', payload: mode }), [dispatch]),
    setCurrentPage: useCallback((page: number) => dispatch({ type: 'SET_CURRENT_PAGE', payload: page }), [dispatch]),
    setNumPages: useCallback((numPages: number) => dispatch({ type: 'SET_NUM_PAGES', payload: numPages }), [dispatch]),
    setDocumentSize: useCallback((size: { width: number; height: number }) => 
      dispatch({ type: 'SET_DOCUMENT_SIZE', payload: size }), [dispatch]),
  };
}
