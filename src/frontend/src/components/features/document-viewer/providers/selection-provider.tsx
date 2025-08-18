/**
 * Selection Context Provider
 * 
 * Provides a clean React interface using the new domain manager library
 * Maintains identical external interface for seamless migration
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createDomainManager, type DomainManager, type PendingChanges } from '@/lib/domain-manager';
import { selectionManagerConfig, type Selection, type SelectionCreateType } from '../managers/configs/selection-manager-config';

// Legacy type aliases for backward compatibility
type SelectionManagerState = ReturnType<DomainManager<Selection>['getState']>;
type SelectionManagerAction = { type: string; payload?: any };

interface SelectionContextValue {
  // State
  state: SelectionManagerState;
  
  // Core actions
  dispatch: (action: SelectionManagerAction) => void;
  
  // Convenience methods
  startDraw: (selection: SelectionCreateType) => void;
  updateDraw: (selection: SelectionCreateType) => void;
  finishDraw: () => void;
  cancelDraw: () => void;
  selectSelection: (id: string | null) => void;
  updateSelection: (id: string, selection: Selection) => void;
  updateSelectionBatch: (id: string, selection: Selection) => void;
  finishBatchOperation: () => void;
  deleteSelection: (id: string) => void;
  deleteSelectedSelection: () => boolean;
  toggleSelectionGlobal: (id: string, currentPageNumber?: number | null) => void;
  setSelectionPage: (id: string, pageNumber: number | null) => void;
  loadSavedSelections: (selections: Selection[]) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  clearPage: (pageNumber: number) => void;
  commitChanges: () => void;
  discardAllChanges: () => void;
  
  // API methods
  saveAllChanges: () => Promise<import('@/lib/result').Result<void, unknown>>;
  
  // Event callbacks
  onSelectionDoubleClick?: (selection: Selection) => void;
  setOnSelectionDoubleClick: (callback: ((selection: Selection) => void) | undefined) => void;
  
  // Computed values
  allSelections: Selection[];
  selectedSelection: Selection | null;
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  pendingChanges: PendingChanges<Selection>;
  pendingChangesCount: number;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

interface SelectionProviderProps {
  children: React.ReactNode;
  documentId: string;
  initialSelections?: {
    saved?: Selection[];
    new?: Selection[];
  };
}

export function SelectionProvider({ children, documentId, initialSelections }: SelectionProviderProps) {
  // Create domain manager instance (only once per documentId)
  const managerRef = useRef<DomainManager<Selection> | null>(null);
  const currentDocumentId = useRef<string>(documentId);

  // Re-create manager if document ID changes
  if (!managerRef.current || currentDocumentId.current !== documentId) {
    managerRef.current = createDomainManager(selectionManagerConfig, documentId);
    currentDocumentId.current = documentId;
    
    // Initialize with saved/new selections if provided
    if (initialSelections?.saved?.length) {
      managerRef.current.dispatch({ type: 'LOAD_SAVED_ITEMS', payload: initialSelections.saved });
    }
    if (initialSelections?.new?.length) {
      initialSelections.new.forEach(selection => {
        managerRef.current!.dispatch({ type: 'ADD_ITEM', payload: selection });
      });
    }
  }
  
  const manager = managerRef.current;
  
  // Subscribe to state changes
  const [state, setState] = useState<SelectionManagerState>(manager.getState());
  
  // Double-click callback state
  const [onSelectionDoubleClick, setOnSelectionDoubleClickState] = useState<((selection: Selection) => void) | undefined>();
  
  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, [manager]);
  
  // Callback setter
  const setOnSelectionDoubleClick = useCallback((callback: ((selection: Selection) => void) | undefined) => {
    setOnSelectionDoubleClickState(() => callback);
  }, []);
  
  // Memoized dispatch function
  const dispatch = useCallback((action: SelectionManagerAction) => {
    manager.dispatch(action);
  }, [manager]);
  
  // Convenience methods
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
  
  const selectSelection = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ITEM', payload: id });
  }, [dispatch]);
  
  const updateSelection = useCallback((id: string, selection: Selection) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: selection } });
  }, [dispatch]);
  
  const updateSelectionBatch = useCallback((id: string, selection: Selection) => {
    dispatch({ type: 'UPDATE_ITEM_BATCH', payload: { id, updates: selection } });
  }, [dispatch]);
  
  const finishBatchOperation = useCallback(() => {
    dispatch({ type: 'FINISH_BATCH_OPERATION' });
  }, [dispatch]);
  
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
  
  const toggleSelectionGlobal = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_ITEM_GLOBAL', payload: id });
  }, [dispatch]);
  
  const setSelectionPage = useCallback((id: string, pageNumber: number | null) => {
    dispatch({ type: 'SET_ITEM_PAGE', payload: { id, page: pageNumber } });
  }, [dispatch]);
  
  const loadSavedSelections = useCallback((selections: Selection[]) => {
    dispatch({ type: 'LOAD_SAVED_ITEMS', payload: selections });
  }, [dispatch]);
  
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, [dispatch]);
  
  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, [dispatch]);
  
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, [dispatch]);
  
  const clearPage = useCallback((pageNumber: number) => {
    dispatch({ type: 'CLEAR_PAGE', payload: pageNumber });
  }, [dispatch]);
  
  const commitChanges = useCallback(() => {
    dispatch({ type: 'COMMIT_CHANGES' });
  }, [dispatch]);
  
  const discardAllChanges = useCallback(() => {
    dispatch({ type: 'DISCARD_ALL_CHANGES' });
  }, [dispatch]);
  
  // API methods
  const saveAllChanges = useCallback(() => {
    return manager.saveAllChanges();
  }, [manager]);
  
  // Computed values - Use domain manager methods and state methods
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
  
  const contextValue: SelectionContextValue = useMemo(() => ({
    state,
    dispatch,
    startDraw,
    updateDraw,
    finishDraw,
    cancelDraw,
    selectSelection,
    updateSelection,
    updateSelectionBatch,
    finishBatchOperation,
    deleteSelection,
    deleteSelectedSelection,
    toggleSelectionGlobal,
    setSelectionPage,
    loadSavedSelections,
    undo,
    redo,
    clearAll,
    clearPage,
    commitChanges,
    discardAllChanges,
    saveAllChanges,
    onSelectionDoubleClick,
    setOnSelectionDoubleClick,
    allSelections,
    selectedSelection,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    pendingChanges,
    pendingChangesCount,
  }), [
    state,
    dispatch,
    startDraw,
    updateDraw,
    finishDraw,
    cancelDraw,
    selectSelection,
    updateSelection,
    updateSelectionBatch,
    finishBatchOperation,
    deleteSelection,
    deleteSelectedSelection,
    toggleSelectionGlobal,
    setSelectionPage,
    loadSavedSelections,
    undo,
    redo,
    clearAll,
    clearPage,
    commitChanges,
    discardAllChanges,
    saveAllChanges,
    onSelectionDoubleClick,
    setOnSelectionDoubleClick,
    allSelections,
    selectedSelection,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    pendingChanges,
    pendingChangesCount,
  ]);
  
  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
    </SelectionContext.Provider>
  );
}

// Hook to use selection context
export function useSelections(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelections must be used within a SelectionProvider');
  }
  return context;
}

export default SelectionProvider;
