/**
 * Prompt Context Provider
 * 
 * Provides a clean React interface using the new domain manager library
 * Maintains identical external interface for seamless migration
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createDomainManager, type DomainManager, type PendingChanges } from '@/lib/domain-manager';
import { promptManagerConfig, type PromptType, type PromptCreateType } from '../managers/configs/prompt-manager-config';
import { type Result } from '@/lib/result';

// Legacy type aliases for backward compatibility
type PromptManagerState = ReturnType<DomainManager<PromptType>['getState']>;
type PromptManagerAction = { type: string; payload?: any };
type PendingPromptChanges = PendingChanges<PromptType>;

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
  // Create domain manager instance (only once per documentId)
  const managerRef = useRef<DomainManager<PromptType> | null>(null);
  const currentDocumentId = useRef<string>(documentId);

  // Re-create manager if document ID changes
  if (!managerRef.current || currentDocumentId.current !== documentId) {
    managerRef.current = createDomainManager(promptManagerConfig, documentId);
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
    return manager.loadItems();
  }, [manager]);
  
  const saveAllChanges = useCallback(async () => {
    return manager.saveAllChanges();
  }, [manager]);
  
  // Local operations (don't hit server immediately) - Adapter methods
  const addPromptLocally = useCallback((promptData: Omit<PromptCreateType, 'document_id'>) => {
    const promptWithId: PromptType = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...promptData,
      document_id: documentId,
      created_at: new Date().toISOString(),
      updated_at: null
    };
    
    manager.dispatch({ type: 'ADD_ITEM', payload: promptWithId });
    return promptWithId;
  }, [manager, documentId]);
  
  const updatePrompt = useCallback((id: string, updates: Partial<PromptType>) => {
    const existingPrompt = manager.getItemById(id);
    if (existingPrompt) {
      manager.dispatch({ 
        type: 'UPDATE_ITEM', 
        payload: { id, updates }
      });
      return true;
    }
    return false;
  }, [manager]);
  
  const deletePromptLocally = useCallback((id: string) => {
    const existingPrompt = manager.getItemById(id);
    if (existingPrompt) {
      manager.dispatch({ type: 'DELETE_ITEM', payload: id });
      return true;
    }
    return false;
  }, [manager]);
  
  const clearAll = useCallback(() => {
    manager.dispatch({ type: 'CLEAR_ALL' });
  }, [manager]);
  
  const discardAllChanges = useCallback(() => {
    manager.dispatch({ type: 'DISCARD_ALL_CHANGES' });
  }, [manager]);
  
  // Convenience methods - Use domain manager methods
  const getPromptById = useCallback((id: string) => {
    return manager.getItemById(id);
  }, [manager]);
  
  const getAllPrompts = useCallback(() => {
    return manager.getAllItems();
  }, [manager]);
  
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);
  
  // Computed values - Use state methods from domain manager
  const promptCount = useMemo(() => (state as any).getPromptCount?.() || manager.getItemCount(), [manager, state]);
  const hasPrompts = useMemo(() => (state as any).hasPrompts?.() || manager.hasItems(), [manager, state]);
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
