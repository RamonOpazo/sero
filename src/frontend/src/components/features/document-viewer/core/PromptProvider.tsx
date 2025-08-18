/**
 * Prompt Context Provider
 * 
 * Provides a clean React interface to the PromptManager following the same pattern as SelectionProvider
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import PromptManager, { 
  type PromptManagerState, 
  type PromptManagerAction,
  type PendingPromptChanges 
} from './PromptManager';
import { type PromptType, type PromptCreateType } from '@/types';
import { type Result } from '@/lib/result';

interface PromptContextValue {
  // State
  state: PromptManagerState;
  
  // Core actions
  dispatch: (action: PromptManagerAction) => void;
  
  // API methods
  loadPrompts: () => Promise<Result<PromptType[], unknown>>;
  saveAllChanges: () => Promise<Result<void, unknown>>;
  
  // Local operations (don't hit server immediately)
  addPromptLocally: (promptData: Omit<PromptCreateType, 'document_id'>) => PromptType;
  updatePrompt: (id: string, updates: Partial<PromptType>) => boolean;
  deletePromptLocally: (id: string) => boolean;
  clearAll: () => void;
  discardAllChanges: () => void;
  
  // Convenience methods
  getPromptById: (id: string) => PromptType | undefined;
  getAllPrompts: () => PromptType[];
  clearError: () => void;
  
  // Computed values
  promptCount: number;
  hasPrompts: boolean;
  hasUnsavedChanges: boolean;
  pendingChanges: PendingPromptChanges;
  pendingChangesCount: number;
  isOperationInProgress: boolean;
  isAnyOperationInProgress: boolean;
}

const PromptContext = createContext<PromptContextValue | null>(null);

interface PromptProviderProps {
  children: React.ReactNode;
  documentId: string;
  initialPrompts?: PromptType[];
}

export function PromptProvider({ children, documentId }: PromptProviderProps) {
  // Create manager instance (only once per documentId)
  const managerRef = useRef<PromptManager | null>(null);
  const currentDocumentId = useRef<string>(documentId);

  // Re-create manager if document ID changes
  if (!managerRef.current || currentDocumentId.current !== documentId) {
    managerRef.current = new PromptManager(documentId);
    currentDocumentId.current = documentId;
  }
  
  const manager = managerRef.current;
  
  // Subscribe to state changes
  const [state, setState] = useState<PromptManagerState>(manager.getState());
  
  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return unsubscribe;
  }, [manager]);
  
  // Memoized dispatch function
  const dispatch = useCallback((action: PromptManagerAction) => {
    manager.dispatch(action);
  }, [manager]);
  
  // API methods
  const loadPrompts = useCallback(async () => {
    return manager.loadPrompts();
  }, [manager]);
  
  const saveAllChanges = useCallback(async () => {
    return manager.saveAllChanges();
  }, [manager]);
  
  // Local operations (don't hit server immediately)
  const addPromptLocally = useCallback((promptData: Omit<PromptCreateType, 'document_id'>) => {
    return manager.addPromptLocally(promptData);
  }, [manager]);
  
  const updatePrompt = useCallback((id: string, updates: Partial<PromptType>) => {
    return manager.updatePrompt(id, updates);
  }, [manager]);
  
  const deletePromptLocally = useCallback((id: string) => {
    return manager.deletePromptLocally(id);
  }, [manager]);
  
  const clearAll = useCallback(() => {
    manager.clearAll();
  }, [manager]);
  
  const discardAllChanges = useCallback(() => {
    manager.discardAllChanges();
  }, [manager]);
  
  // Convenience methods
  const getPromptById = useCallback((id: string) => {
    return manager.getPromptById(id);
  }, [manager]);
  
  const getAllPrompts = useCallback(() => {
    return manager.getAllPrompts();
  }, [manager]);
  
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);
  
  // Computed values
  const promptCount = useMemo(() => manager.getPromptCount(), [manager, state]);
  const hasPrompts = useMemo(() => manager.hasPrompts(), [manager, state]);
  const hasUnsavedChanges = useMemo(() => manager.hasUnsavedChanges(), [manager, state]);
  const pendingChanges = useMemo(() => manager.getPendingChanges(), [manager, state]);
  const pendingChangesCount = useMemo(() => manager.getPendingChangesCount(), [manager, state]);
  const isOperationInProgress = useMemo(() => 
    state.isLoading || state.isCreating || state.isDeleting !== null, 
    [state.isLoading, state.isCreating, state.isDeleting]
  );
  const isAnyOperationInProgress = useMemo(() => 
    state.isLoading || state.isCreating || state.isDeleting !== null || state.isClearing || state.isSaving, 
    [state.isLoading, state.isCreating, state.isDeleting, state.isClearing, state.isSaving]
  );
  
  const contextValue: PromptContextValue = useMemo(() => ({
    state,
    dispatch,
    loadPrompts,
    saveAllChanges,
    addPromptLocally,
    updatePrompt,
    deletePromptLocally,
    clearAll,
    discardAllChanges,
    getPromptById,
    getAllPrompts,
    clearError,
    promptCount,
    hasPrompts,
    hasUnsavedChanges,
    pendingChanges,
    pendingChangesCount,
    isOperationInProgress,
    isAnyOperationInProgress,
  }), [
    state,
    dispatch,
    loadPrompts,
    saveAllChanges,
    addPromptLocally,
    updatePrompt,
    deletePromptLocally,
    clearAll,
    discardAllChanges,
    getPromptById,
    getAllPrompts,
    clearError,
    promptCount,
    hasPrompts,
    hasUnsavedChanges,
    pendingChanges,
    pendingChangesCount,
    isOperationInProgress,
    isAnyOperationInProgress,
  ]);
  
  return (
    <PromptContext.Provider value={contextValue}>
      {children}
    </PromptContext.Provider>
  );
}

// Hook to use prompt context
export function usePrompts(): PromptContextValue {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePrompts must be used within a PromptProvider');
  }
  return context;
}

export default PromptProvider;
