/**
 * Selection Provider - React Context for Selection Management
 * 
 * Provides a React context wrapper around the V2 domain manager for selections.
 * Exposes all required selection functionality with clean separation of concerns.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createSelectionManager, type SelectionDomainManager, type Selection, type SelectionCreateType } from './selection-manager';
import type { Result } from '@/lib/result';
import type { PendingChanges } from '@/lib/domain-manager';

// =============================================================================
// CONTEXT INTERFACE - All expected selection functionality
// =============================================================================

interface SelectionContextValue {
  // State access
  state: ReturnType<SelectionDomainManager['getState']>;
  
  // Core actions
  dispatch: SelectionDomainManager['dispatch'];
  
  // Convenience methods for all required operations
  
  // *** CREATE NEW SELECTIONS ***
  startDraw: (selection: SelectionCreateType) => void;
  updateDraw: (selection: SelectionCreateType) => void;
  finishDraw: () => void;
  cancelDraw: () => void;
  
  // *** EDIT NEW/SAVED SELECTIONS ***
  updateSelection: (id: string, selection: Selection) => void;
  updateSelectionBatch: (id: string, selection: Selection) => void;
  finishBatchOperation: () => void;
  
  // *** DELETE NEW/SAVED SELECTIONS ***
  deleteSelection: (id: string) => void;
  deleteSelectedSelection: () => boolean;
  
  // *** HISTORY OF CHANGES ***
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // *** CLEAR SELECTIONS ***
  clearPage: (pageNumber: number) => void;
  clearAll: () => void;
  
  // *** COMMIT STAGED CHANGES ***
  saveAllChanges: () => Promise<Result<void, unknown>>;
  commitChanges: () => void;
  discardAllChanges: () => void;
  
  // Selection tracking
  selectSelection: (id: string | null) => void;
  selectedSelection: Selection | null;
  
  // Page operations
  toggleSelectionGlobal: (id: string, currentPageNumber?: number | null) => void;
  setSelectionPage: (id: string, pageNumber: number | null) => void;
  
  // Data loading
  loadSavedSelections: (selections: Selection[]) => void;
  
  // Event callbacks
  onSelectionDoubleClick?: (selection: Selection) => void;
  setOnSelectionDoubleClick: (callback: ((selection: Selection) => void) | undefined) => void;
  
  // Computed values
  allSelections: readonly Selection[];
  hasUnsavedChanges: boolean;
  pendingChanges: PendingChanges<Selection>;
  pendingChangesCount: number;
  
  // Utility methods
  hasSelections: boolean;
  selectionCount: number;
  getCurrentDraw: () => Selection | null;
  isCurrentlyDrawing: boolean;
  getSelectionsForPage: (page: number | null) => readonly Selection[];
  getGlobalSelections: () => readonly Selection[];
  getPageSelections: (page: number) => readonly Selection[];
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

// =============================================================================
// PROVIDER PROPS
// =============================================================================

interface SelectionProviderProps {
  children: React.ReactNode;
  documentId: string;
  initialSelections?: {
    saved?: Selection[];
    new?: Selection[];
  };
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function SelectionProvider({ children, documentId, initialSelections }: SelectionProviderProps) {
  // Create and manage domain manager instance
  const managerRef = useRef<SelectionDomainManager | null>(null);
  const currentDocumentId = useRef<string>(documentId);

  // Re-create manager if document ID changes
  if (!managerRef.current || currentDocumentId.current !== documentId) {
    managerRef.current = createSelectionManager(documentId, initialSelections);
    currentDocumentId.current = documentId;
  }
  
  const manager = managerRef.current;
  
  // Subscribe to state changes
  const [state, setState] = useState(manager.getState());
  
  // Double-click callback management
  const [onSelectionDoubleClick, setOnSelectionDoubleClickState] = useState<((selection: Selection) => void) | undefined>();
  
  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, [manager]);
  
  // ========================================
  // CORE ACTION DISPATCH
  // ========================================
  
  const dispatch = useCallback((action: { type: string; payload?: any }) => {
    manager.dispatch(action);
  }, [manager]);
  
  // ========================================
  // CREATE NEW SELECTIONS
  // ========================================
  
  const startDraw = useCallback((selection: SelectionCreateType) => {
    // Convert SelectionCreateType to Selection by adding temporary ID
    const selectionWithId: Selection = {
      ...selection,
      id: selection.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    dispatch({ type: 'START_DRAW', payload: selectionWithId });
  }, [dispatch]);
  
  const updateDraw = useCallback((selection: SelectionCreateType) => {
    // Convert SelectionCreateType to Selection by adding temporary ID
    const selectionWithId: Selection = {
      ...selection,
      id: selection.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    dispatch({ type: 'UPDATE_DRAW', payload: selectionWithId });
  }, [dispatch]);
  
  const finishDraw = useCallback(() => {
    dispatch({ type: 'FINISH_DRAW' });
  }, [dispatch]);
  
  const cancelDraw = useCallback(() => {
    dispatch({ type: 'CANCEL_DRAW' });
  }, [dispatch]);
  
  // ========================================
  // EDIT NEW/SAVED SELECTIONS
  // ========================================
  
  const updateSelection = useCallback((id: string, selection: Selection) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: selection } });
  }, [dispatch]);
  
  const updateSelectionBatch = useCallback((id: string, selection: Selection) => {
    dispatch({ type: 'UPDATE_ITEM_BATCH', payload: { id, updates: selection } });
  }, [dispatch]);
  
  const finishBatchOperation = useCallback(() => {
    dispatch({ type: 'FINISH_BATCH_OPERATION' });
  }, [dispatch]);
  
  // ========================================
  // DELETE NEW/SAVED SELECTIONS
  // ========================================
  
  const deleteSelection = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ITEM', payload: id });
  }, [dispatch]);
  
  const deleteSelectedSelection = useCallback(() => {
    if (state.selectedItemId) {
      dispatch({ type: 'DELETE_ITEM', payload: state.selectedItemId });
      return true;
    }
    return false;
  }, [dispatch, state.selectedItemId]);
  
  // ========================================
  // HISTORY OF CHANGES
  // ========================================
  
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, [dispatch]);
  
  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, [dispatch]);
  
  // ========================================
  // CLEAR SELECTIONS
  // ========================================
  
  const clearPage = useCallback((pageNumber: number) => {
    dispatch({ type: 'CLEAR_PAGE', payload: pageNumber });
  }, [dispatch]);
  
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, [dispatch]);
  
  // ========================================
  // COMMIT STAGED CHANGES
  // ========================================
  
  const saveAllChanges = useCallback(() => {
    return manager.saveAllChanges();
  }, [manager]);
  
  const commitChanges = useCallback(() => {
    dispatch({ type: 'COMMIT_CHANGES' });
  }, [dispatch]);
  
  const discardAllChanges = useCallback(() => {
    dispatch({ type: 'DISCARD_CHANGES' });
  }, [dispatch]);
  
  // ========================================
  // SELECTION TRACKING
  // ========================================
  
  const selectSelection = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ITEM', payload: id });
  }, [dispatch]);
  
  // ========================================
  // PAGE OPERATIONS
  // ========================================
  
  const toggleSelectionGlobal = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_ITEM_GLOBAL', payload: id });
  }, [dispatch]);
  
  const setSelectionPage = useCallback((id: string, pageNumber: number | null) => {
    dispatch({ type: 'SET_ITEM_PAGE', payload: { id, page: pageNumber } });
  }, [dispatch]);
  
  // ========================================
  // DATA LOADING
  // ========================================
  
  const loadSavedSelections = useCallback((selections: Selection[]) => {
    dispatch({ type: 'LOAD_ITEMS', payload: selections });
  }, [dispatch]);
  
  // ========================================
  // EVENT CALLBACKS
  // ========================================
  
  const setOnSelectionDoubleClick = useCallback((callback: ((selection: Selection) => void) | undefined) => {
    setOnSelectionDoubleClickState(() => callback);
  }, []);
  
  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  const allSelections = useMemo(() => manager.getAllItems(), [manager, state]);
  
  const selectedSelection = useMemo(() => {
    const selectedId = state.selectedItemId;
    return selectedId ? manager.getItemById(selectedId) || null : null;
  }, [manager, state]);
  
  const canUndo = useMemo(() => (state as any).canUndo?.() || false, [state]);
  const canRedo = useMemo(() => (state as any).canRedo?.() || false, [state]);
  const hasUnsavedChanges = useMemo(() => manager.hasUnsavedChanges(), [manager, state]);
  const pendingChanges = useMemo(() => manager.getPendingChanges(), [manager, state]);
  const pendingChangesCount = useMemo(() => manager.getPendingChangesCount(), [manager, state]);
  
  // Utility computed values
  const hasSelections = useMemo(() => allSelections.length > 0, [allSelections]);
  const selectionCount = useMemo(() => allSelections.length, [allSelections]);
  const getCurrentDraw = useCallback(() => (state as any).getCurrentDraw?.() || null, [state]);
  const isCurrentlyDrawing = useMemo(() => (state as any).isCurrentlyDrawing?.() || false, [state]);
  
  // Page operations
  const getSelectionsForPage = useCallback((page: number | null) => {
    return (state as any).getSelectionsForPage?.(page) || [];
  }, [state]);
  
  const getGlobalSelections = useCallback(() => {
    return (state as any).getGlobalSelections?.() || [];
  }, [state]);
  
  const getPageSelections = useCallback((page: number) => {
    return (state as any).getPageSelections?.(page) || [];
  }, [state]);
  
  // ========================================
  // CONTEXT VALUE
  // ========================================
  
  const contextValue: SelectionContextValue = useMemo(() => ({
    // State access
    state,
    dispatch,
    
    // Create new selections
    startDraw,
    updateDraw,
    finishDraw,
    cancelDraw,
    
    // Edit new/saved selections
    updateSelection,
    updateSelectionBatch,
    finishBatchOperation,
    
    // Delete new/saved selections
    deleteSelection,
    deleteSelectedSelection,
    
    // History of changes
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Clear selections
    clearPage,
    clearAll,
    
    // Commit staged changes
    saveAllChanges,
    commitChanges,
    discardAllChanges,
    
    // Selection tracking
    selectSelection,
    selectedSelection,
    
    // Page operations
    toggleSelectionGlobal,
    setSelectionPage,
    
    // Data loading
    loadSavedSelections,
    
    // Event callbacks
    onSelectionDoubleClick,
    setOnSelectionDoubleClick,
    
    // Computed values
    allSelections,
    hasUnsavedChanges,
    pendingChanges,
    pendingChangesCount,
    
    // Utility methods
    hasSelections,
    selectionCount,
    getCurrentDraw,
    isCurrentlyDrawing,
    getSelectionsForPage,
    getGlobalSelections,
    getPageSelections,
  }), [
    state, dispatch, startDraw, updateDraw, finishDraw, cancelDraw,
    updateSelection, updateSelectionBatch, finishBatchOperation,
    deleteSelection, deleteSelectedSelection, undo, redo, canUndo, canRedo,
    clearPage, clearAll, saveAllChanges, commitChanges, discardAllChanges,
    selectSelection, selectedSelection, toggleSelectionGlobal, setSelectionPage,
    loadSavedSelections, onSelectionDoubleClick, setOnSelectionDoubleClick,
    allSelections, hasUnsavedChanges, pendingChanges, pendingChangesCount,
    hasSelections, selectionCount, getCurrentDraw, isCurrentlyDrawing,
    getSelectionsForPage, getGlobalSelections, getPageSelections
  ]);
  
  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
    </SelectionContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useSelections(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelections must be used within a SelectionProvider');
  }
  return context;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SelectionProvider;
export type { SelectionContextValue, Selection, SelectionCreateType };
