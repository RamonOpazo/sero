/**
 * Prompt Context Provider
 * 
 * Provides a clean React interface to the PromptManager following the same pattern as SelectionProvider
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import PromptManager, { 
  type PromptManagerState, 
  type PromptManagerAction 
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
  createPrompt: (promptData: PromptCreateType) => Promise<Result<PromptType, unknown>>;
  deletePrompt: (promptId: string) => Promise<Result<void, unknown>>;
  
  // Convenience methods
  getPromptById: (id: string) => PromptType | undefined;
  clearError: () => void;
  
  // Computed values
  promptCount: number;
  hasPrompts: boolean;
  isOperationInProgress: boolean;
}

const PromptContext = createContext<PromptContextValue | null>(null);

interface PromptProviderProps {
  children: React.ReactNode;
  documentId: string;
  initialPrompts?: PromptType[];
}

export function PromptProvider({ children, documentId, initialPrompts }: PromptProviderProps) {
  // Create manager instance (only once per documentId)
  const managerRef = useRef<PromptManager | null>(null);
  const currentDocumentId = useRef<string>(documentId);

  // Re-create manager if document ID changes
  if (!managerRef.current || currentDocumentId.current !== documentId) {
    managerRef.current = new PromptManager(documentId, initialPrompts);
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
  
  const createPrompt = useCallback(async (promptData: PromptCreateType) => {
    return manager.createPrompt(promptData);
  }, [manager]);
  
  const deletePrompt = useCallback(async (promptId: string) => {
    return manager.deletePrompt(promptId);
  }, [manager]);
  
  // Convenience methods
  const getPromptById = useCallback((id: string) => {
    return manager.getPromptById(id);
  }, [manager]);
  
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);
  
  // Computed values
  const promptCount = useMemo(() => manager.getPromptCount(), [manager, state]);
  const hasPrompts = useMemo(() => manager.hasPrompts(), [manager, state]);
  const isOperationInProgress = useMemo(() => 
    state.isLoading || state.isCreating || state.isDeleting !== null, 
    [state.isLoading, state.isCreating, state.isDeleting]
  );
  
  const contextValue: PromptContextValue = useMemo(() => ({
    state,
    dispatch,
    loadPrompts,
    createPrompt,
    deletePrompt,
    getPromptById,
    clearError,
    promptCount,
    hasPrompts,
    isOperationInProgress,
  }), [
    state,
    dispatch,
    loadPrompts,
    createPrompt,
    deletePrompt,
    getPromptById,
    clearError,
    promptCount,
    hasPrompts,
    isOperationInProgress,
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
