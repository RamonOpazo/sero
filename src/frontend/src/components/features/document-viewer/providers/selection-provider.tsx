/**
 * Selection Provider - React Context for Selection Management
 * 
 * Provides a React context wrapper around the V2 domain manager for selections.
 * Exposes all required selection functionality with clean separation of concerns.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createSelectionManager, type SelectionDomainManager, type Selection, type SelectionCreateType } from '../core/selection-manager';
import type { SelectionCreateDraft } from '../types/viewer';
import type { Result } from '@/lib/result';
import type { PendingChanges } from '@/lib/domain-manager';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import { fromApiSelection } from '../core/selection-lifecycle-mapper';
import { UISelectionStage, type UISelection } from '../types/selection-lifecycle';

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
  startDraw: (selection: SelectionCreateDraft) => void;
  updateDraw: (selection: SelectionCreateDraft) => void;
  finishDraw: () => void;
  cancelDraw: () => void;
  
  // *** EDIT NEW/SAVED SELECTIONS ***
  updateSelection: (id: string, selection: Selection) => void;
  updateSelectionBatch: (id: string, selection: Selection) => void;
  finishBatchOperation: () => void;
  beginBatchOperation: () => void;
  
  // *** DELETE NEW/SAVED SELECTIONS ***
  deleteSelection: (id: string) => void;
  deleteSelectedSelection: () => boolean;
  
  // *** STATE TRANSITIONS ***
  convertSelectionToStagedEdition: (id: string) => Promise<boolean>;
  
  // *** HISTORY OF CHANGES ***
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // *** CLEAR SELECTIONS ***
  clearPage: (pageNumber: number) => void;
  clearAll: () => void;
  
  // *** COMMIT STAGED CHANGES ***
  save: () => Promise<Result<void, unknown>>;
  commitChanges: () => void;
  discardAllChanges: () => void;

  // Lifecycle-based operations (new)
  saveLifecycle: () => Promise<Result<void, unknown>>;
  commitLifecycle: () => Promise<Result<void, unknown>>;
  
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
  
  // Navigation hooks
  setOnNavigateToPage: (callback: ((pageNumber: number) => void) | undefined) => void;
  
  // Computed values
  allSelections: readonly Selection[];
  uiSelections: readonly UISelection[];
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
  const [onNavigateToPage, setOnNavigateToPageState] = useState<((pageNumber: number) => void) | undefined>();
  
  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, [manager]);
  
  // ========================================
  // CORE ACTION DISPATCH
  // ========================================
  
  const dispatch = useCallback((actionType: string, payload?: any) => {
    (manager as any).dispatch(actionType, payload);
  }, [manager]);
  
  // ========================================
  // CREATE NEW SELECTIONS
  // ========================================
  
  const startDraw = useCallback((selection: SelectionCreateDraft) => {
    // Convert SelectionCreateType to Selection by adding temporary ID
    const selectionWithId: Selection = {
      ...selection,
      id: selection.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    dispatch('START_DRAW', selectionWithId);
  }, [dispatch]);

  const convertSelectionToStagedEdition = useCallback(async (id: string) => {
    try {
      const item = (manager as any).getItemById?.(id);
      const stateStr = ((item?.state) || '').toString();
      if (stateStr === 'committed') {
        const res = await DocumentViewerAPI.convertSelectionToStaged(id);
        if (!res.ok) return false;
      } else {
        // For staged_deletion or other staged states, flip to staged_edition via update
        const res = await DocumentViewerAPI.updateSelection(id, { state: 'staged_edition' } as any);
        if (!res.ok) return false;
      }
      // Update local state regardless
      dispatch('UPDATE_ITEM', { id, updates: { state: 'staged_edition' } as any });
      return true;
    } catch {
      return false;
    }
  }, [dispatch, manager]);
  
  const updateDraw = useCallback((selection: SelectionCreateDraft) => {
    // Convert SelectionCreateType to Selection by adding temporary ID
    const selectionWithId: Selection = {
      ...selection,
      id: selection.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    dispatch('UPDATE_DRAW', selectionWithId);
  }, [dispatch]);
  
  const finishDraw = useCallback(() => {
    dispatch('FINISH_DRAW');
  }, [dispatch]);
  
  const cancelDraw = useCallback(() => {
    dispatch('CANCEL_DRAW');
  }, [dispatch]);
  
  // ========================================
  // EDIT NEW/SAVED SELECTIONS
  // ========================================
  
  const updateSelection = useCallback((id: string, selection: Selection) => {
    dispatch('UPDATE_ITEM', { id, updates: selection });
  }, [dispatch]);
  
  const updateSelectionBatch = useCallback((id: string, selection: Selection) => {
    // Use standard V2 UPDATE_ITEM behavior for proper change tracking
    // Batch functionality is handled by the BEGIN_BATCH/END_BATCH actions
    dispatch('UPDATE_ITEM', { id, updates: selection });
  }, [dispatch]);
  
  const finishBatchOperation = useCallback(() => {
    dispatch('END_BATCH');
  }, [dispatch]);
  
  const beginBatchOperation = useCallback(() => {
    dispatch('BEGIN_BATCH');
  }, [dispatch]);
  
  // ========================================
  // DELETE NEW/SAVED SELECTIONS
  // ========================================
  
  const deleteSelection = useCallback((id: string) => {
    // If item is persisted, mark as staged_deletion; if draft, remove
    const persistedItems: any[] = (state as any).persistedItems || [];
    const draftItems: any[] = (state as any).draftItems || [];
    const isPersisted = persistedItems.some((i: any) => i && i.id === id);
    if (isPersisted) {
      dispatch('UPDATE_ITEM', { id, updates: { state: 'staged_deletion' } });
    } else {
      const isDraft = draftItems.some((i: any) => i && i.id === id);
      if (isDraft) {
        dispatch('DELETE_ITEM', id);
      }
    }
  }, [dispatch, state]);
  
  const deleteSelectedSelection = useCallback(() => {
    const selectedId = (state as any).selectedItemId;
    if (selectedId && typeof selectedId === 'string') {
      dispatch('DELETE_ITEM', selectedId);
      return true;
    }
    return false;
  }, [dispatch, state]);
  
  // ========================================
  // STATE TRANSITIONS
  // ========================================
  
  
  // ========================================
  // HISTORY OF CHANGES
  // ========================================
  
  const undo = useCallback(() => {
    // Determine target page, then UNDO, then navigate (next frame) so UI reflects the new state
    let targetPage: number | null | undefined = undefined;
    try {
      const history = (manager as any).getChangeHistory?.() || [];
      const position = (manager as any).getHistoryPosition?.() || 0; // 1-based
      const targetIndex = position - 1; // current applied change index
      const change = history[targetIndex];
      if (change) {
        if (change.item && typeof change.item.page_number !== 'undefined') {
          targetPage = change.item.page_number;
        } else if (change.itemId) {
          const item = manager.getItemById(change.itemId);
          targetPage = item?.page_number ?? change.previousValues?.page_number ?? change.newValues?.page_number;
        }
      }
    } catch {}
    dispatch('UNDO');
    if (onNavigateToPage && typeof targetPage === 'number' && targetPage !== null) {
      requestAnimationFrame(() => onNavigateToPage(targetPage as number));
    }
  }, [dispatch, state, onNavigateToPage, manager]);
  
  const redo = useCallback(() => {
    // Determine target page, then REDO, then navigate (next frame) so UI reflects the new state
    let targetPage: number | null | undefined = undefined;
    try {
      const history = (manager as any).getChangeHistory?.() || [];
      const position = (manager as any).getHistoryPosition?.() || 0; // 1-based
      const targetIndex = position; // next change to apply on redo
      const change = history[targetIndex];
      if (change) {
        if (change.item && typeof change.item.page_number !== 'undefined') {
          targetPage = change.item.page_number;
        } else if (change.itemId) {
          const item = manager.getItemById(change.itemId);
          targetPage = item?.page_number ?? change.previousValues?.page_number ?? change.newValues?.page_number;
        }
      }
    } catch {}
    dispatch('REDO');
    if (onNavigateToPage && typeof targetPage === 'number' && targetPage !== null) {
      requestAnimationFrame(() => onNavigateToPage(targetPage as number));
    }
  }, [dispatch, state, onNavigateToPage, manager]);
  
  // ========================================
  // CLEAR SELECTIONS
  // ========================================
  
  const clearPage = useCallback((pageNumber: number) => {
    dispatch('CLEAR_PAGE', pageNumber);
  }, [dispatch]);
  
  const clearAll = useCallback(() => {
    dispatch('CLEAR_GLOBAL_CONTEXT');
  }, [dispatch]);
  
  // ========================================
  // COMMIT STAGED CHANGES
  // ========================================
  
  const save = useCallback(() => {
    return manager.save();
  }, [manager]);

  // Lifecycle-based SAVE: stage all changes reflected in uiSelections
  const saveLifecycle = useCallback(async (): Promise<Result<void, unknown>> => {
    try {
      const currentState = state as any;
      const docId = currentState?.contextId as string;
      // Derive UI selections lifecycle view from current state (avoid TDZ on uiSelections)
      const persisted: UISelection[] = ((state as any).persistedItems || []).map((s: any) => fromApiSelection(s));
      const drafts: UISelection[] = ((state as any).draftItems || []).map((s: any) => ({
        ...(s as any),
        stage: UISelectionStage.Unstaged,
        isPersisted: false,
        dirty: true,
      } as UISelection));
      const ui = [...persisted, ...drafts];

      // Create new selections (not persisted)
      const creates = ui.filter(s => !s.isPersisted);
      for (const sel of creates) {
        const createData = (sel as any);
        const { id: _id, dirty: _dirty, dirtyFields: _df, isPersisted: _p, stage: _st, ...rest } = createData;
        const res = await DocumentViewerAPI.createSelection(docId, rest);
        if (!res.ok) {
          return { ok: false, error: (res as any).error } as Result<void, unknown>;
        }
      }

      // Update persisted selections with staged state transitions
      const updates = ui.filter(s => s.isPersisted && (s.dirty || s.stage === UISelectionStage.StagedEdition || s.stage === UISelectionStage.StagedDeletion || s.stage === UISelectionStage.StagedCreation));
      for (const sel of updates) {
        const updateState = sel.stage === UISelectionStage.StagedEdition
          ? 'staged_edition'
          : sel.stage === UISelectionStage.StagedDeletion
          ? 'staged_deletion'
          : sel.stage === UISelectionStage.StagedCreation
          ? 'staged_creation'
          : undefined;
        const payload: any = {};
        if (updateState) payload.state = updateState;
        const res = await DocumentViewerAPI.updateSelection((sel as any).id, payload);
        if (!res.ok) {
          return { ok: false, error: (res as any).error } as Result<void, unknown>;
        }
      }

      // Reload from server to sync authoritative state
      const fetched = await DocumentViewerAPI.fetchDocumentSelections(docId);
      if (fetched.ok) {
        dispatch('LOAD_ITEMS', fetched.value as any);
        dispatch('CAPTURE_BASELINE' as any, undefined as any);
      }

      return { ok: true, value: undefined } as Result<void, unknown>;
    } catch (e) {
      return { ok: false, error: e } as Result<void, unknown>;
    }
  }, [state, dispatch]);
  
  const commitChanges = useCallback(() => {
    dispatch('COMMIT_CHANGES');
  }, [dispatch]);

  // Lifecycle-based COMMIT: commit all staged on backend and reload
  const commitLifecycle = useCallback(async (): Promise<Result<void, unknown>> => {
    try {
      const currentState = state as any;
      const docId = currentState?.contextId as string;
      const res = await DocumentViewerAPI.commitStagedSelections(docId, { commit_all: true });
      if (!res.ok) {
        return { ok: false, error: (res as any).error } as Result<void, unknown>;
      }
      const fetched = await DocumentViewerAPI.fetchDocumentSelections(docId);
      if (fetched.ok) {
        dispatch('LOAD_ITEMS', fetched.value as any);
        dispatch('CAPTURE_BASELINE' as any, undefined as any);
      }
      return { ok: true, value: undefined } as Result<void, unknown>;
    } catch (e) {
      return { ok: false, error: e } as Result<void, unknown>;
    }
  }, [state, dispatch]);
  
  const discardAllChanges = useCallback(() => {
    dispatch('DISCARD_CHANGES');
  }, [dispatch]);
  
  // ========================================
  // SELECTION TRACKING
  // ========================================
  
  const selectSelection = useCallback((id: string | null) => {
    dispatch('SELECT_ITEM', id);
  }, [dispatch]);
  
  // ========================================
  // PAGE OPERATIONS
  // ========================================
  
  const toggleSelectionGlobal = useCallback((id: string) => {
    // Find the item and toggle its page_number using standard V2 UPDATE_ITEM
    const item = manager.getItemById(id);
    if (item) {
      const newPageNumber = item.page_number === null ? 1 : null;
      dispatch('UPDATE_ITEM', { id, updates: { page_number: newPageNumber } });
    }
  }, [dispatch, manager]);
  
  const setSelectionPage = useCallback((id: string, pageNumber: number | null) => {
    // Use standard V2 UPDATE_ITEM behavior for proper change tracking
    dispatch('UPDATE_ITEM', { id, updates: { page_number: pageNumber } });
  }, [dispatch]);
  
  // ========================================
  // DATA LOADING
  // ========================================
  
  const loadSavedSelections = useCallback((selections: Selection[]) => {
    // Load items into persisted state
    dispatch('LOAD_ITEMS', selections);
    // Capture baseline immediately after loading so subsequent edits are tracked
    dispatch('CAPTURE_BASELINE' as any, undefined as any);
  }, [dispatch]);
  
  // ========================================
  // EVENT CALLBACKS
  // ========================================
  
  const setOnSelectionDoubleClick = useCallback((callback: ((selection: Selection) => void) | undefined) => {
    setOnSelectionDoubleClickState(() => callback);
  }, []);
  
  const setOnNavigateToPage = useCallback((callback: ((pageNumber: number) => void) | undefined) => {
    setOnNavigateToPageState(() => callback);
  }, []);
  
  // ========================================
  // COMPUTED VALUES
  // ========================================
  
  const allSelections = useMemo(() => manager.getAllItems(), [manager, state]);
  
  // Lifecycle-based UI selections (compat-preserving for now)
  const uiSelections = useMemo(() => {
    try {
      const persisted: UISelection[] = ((state as any).persistedItems || []).map((s: any) => fromApiSelection(s));
      const drafts: UISelection[] = ((state as any).draftItems || []).map((s: any) => ({
        ...(s as any),
        stage: UISelectionStage.Unstaged,
        isPersisted: false,
        dirty: true,
      } as UISelection));
      return [...persisted, ...drafts];
    } catch {
      return [] as UISelection[];
    }
  }, [state]);
  
  const selectedSelection = useMemo(() => {
    const selectedId = (state as any).selectedItemId;
    return (selectedId && typeof selectedId === 'string') ? manager.getItemById(selectedId) || null : null;
  }, [manager, state]);
  
  const canUndo = useMemo(() => (state as any).canUndo?.() || false, [state]);
  const canRedo = useMemo(() => (state as any).canRedo?.() || false, [state]);
  const hasUnsavedChanges = useMemo(() => manager.hasUnsavedChanges(), [manager, state]);
  const pendingChanges = useMemo(() => manager.getPendingChanges(), [manager, state]);
  const pendingChangesCount = useMemo(() => manager.getPendingChangesCount(), [manager, state]);
  
  // Utility computed values
  const hasSelections = useMemo(() => allSelections.length > 0, [allSelections]);
  const selectionCount = useMemo(() => allSelections.length, [allSelections]);
  const getCurrentDraw = useCallback(() => {
    const getter = (state as any).getCurrentDraw;
    if (typeof getter === 'function') {
      const value = getter();
      if (value !== undefined) return value;
    }
    return (state as any).currentDraw || null;
  }, [state]);
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
    beginBatchOperation,
    
    // Delete new/saved selections
    deleteSelection,
    deleteSelectedSelection,
    convertSelectionToStagedEdition,
    
    // History of changes
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Clear selections
    clearPage,
    clearAll,
    
    // Commit staged changes
    save,
    commitChanges,
    discardAllChanges,
    saveLifecycle,
    commitLifecycle,
    
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
    setOnNavigateToPage,
    
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
    updateSelection, updateSelectionBatch, finishBatchOperation, beginBatchOperation,
    deleteSelection, deleteSelectedSelection, undo, redo, canUndo, canRedo,
    clearPage, clearAll, save, commitChanges, discardAllChanges,
    selectSelection, selectedSelection, toggleSelectionGlobal, setSelectionPage,
    loadSavedSelections, onSelectionDoubleClick, setOnSelectionDoubleClick,
    allSelections, uiSelections, hasUnsavedChanges, pendingChanges, pendingChangesCount,
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
