/**
 * Selection Context Provider
 * 
 * Provides a clean React interface to the SelectionManager
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import SelectionManager, { 
  type SelectionManagerState, 
  type SelectionManagerAction,
  type PendingChanges
} from './SelectionManager';
import { type Selection, type SelectionCreateType } from '../types/viewer';

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
  pendingChanges: PendingChanges;
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
  // Create manager instance (only once)
  const managerRef = useRef<SelectionManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new SelectionManager(documentId, {
      savedSelections: initialSelections?.saved || [],
      newSelections: initialSelections?.new || [],
    });
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
    dispatch({ type: 'SELECT_SELECTION', payload: id });
  }, [dispatch]);
  
  const updateSelection = useCallback((id: string, selection: Selection) => {
    dispatch({ type: 'UPDATE_SELECTION', payload: { id, selection } });
  }, [dispatch]);
  
  const updateSelectionBatch = useCallback((id: string, selection: Selection) => {
    dispatch({ type: 'UPDATE_SELECTION_BATCH', payload: { id, selection } });
  }, [dispatch]);
  
  const finishBatchOperation = useCallback(() => {
    dispatch({ type: 'FINISH_BATCH_OPERATION' });
  }, [dispatch]);
  
  const deleteSelection = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SELECTION', payload: id });
  }, [dispatch]);
  
  const deleteSelectedSelection = useCallback(() => {
    if (state.selectedSelectionId) {
      dispatch({ type: 'DELETE_SELECTION', payload: state.selectedSelectionId });
      return true;
    }
    return false;
  }, [dispatch, state.selectedSelectionId]);
  
  const toggleSelectionGlobal = useCallback((id: string, currentPageNumber?: number | null) => {
    dispatch({ type: 'TOGGLE_SELECTION_GLOBAL', payload: { id, currentPageNumber } });
  }, [dispatch]);
  
  const setSelectionPage = useCallback((id: string, pageNumber: number | null) => {
    dispatch({ type: 'SET_SELECTION_PAGE', payload: { id, pageNumber } });
  }, [dispatch]);
  
  const loadSavedSelections = useCallback((selections: Selection[]) => {
    dispatch({ type: 'LOAD_SAVED_SELECTIONS', payload: selections });
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
  
  // Computed values - these methods use the manager's internal state which we get updates for via subscription
  const allSelections = useMemo(() => manager.getAllSelections(), [manager, state]);
  const selectedSelection = useMemo(() => manager.getSelectedSelection(), [manager, state]);
  const canUndo = useMemo(() => manager.canUndo(), [manager, state]);
  const canRedo = useMemo(() => manager.canRedo(), [manager, state]);
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
