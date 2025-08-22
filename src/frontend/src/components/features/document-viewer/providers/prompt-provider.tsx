/**
 * Prompt Provider - React Context for Prompt Management
 *
 * Uses the V2 domain manager via prompt manager factory.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPromptManager, type PromptType } from '../core/prompt-manager';
import type { Result } from '@/lib/result';

interface PromptContextValue {
  state: ReturnType<ReturnType<typeof createPromptManager>['getState']>;
  dispatch: ReturnType<typeof createPromptManager>['dispatch'];

  // CRUD helpers
  createPrompt: (data: Omit<PromptType, 'id' | 'created_at' | 'updated_at' | 'document_id'>) => void;
  updatePrompt: (id: string, updates: Partial<PromptType>) => void;
  deletePrompt: (id: string) => void;

  // Load/save
  load: () => Promise<Result<readonly PromptType[], unknown>>;
  save: () => Promise<Result<void, unknown>>;

  // Clear/discard
  clearAll: () => void;
  discardAllChanges: () => void;

  // Computed
  allPrompts: readonly PromptType[];
  hasUnsavedChanges: boolean;
  pendingChangesCount: number;
  pendingChanges: { creates: readonly PromptType[]; updates: readonly PromptType[]; deletes: readonly PromptType[] };
}

const PromptContext = createContext<PromptContextValue | null>(null);

interface PromptProviderProps {
  children: React.ReactNode;
  documentId: string;
  initialPrompts?: PromptType[];
}

export function PromptProvider({ children, documentId, initialPrompts }: PromptProviderProps) {
  const managerRef = useRef<ReturnType<typeof createPromptManager> | null>(null);
  const currentId = useRef<string>(documentId);

  if (!managerRef.current || currentId.current !== documentId) {
    managerRef.current = createPromptManager(documentId, initialPrompts);
    currentId.current = documentId;
  }
  const manager = managerRef.current;

  const [state, setState] = useState(manager.getState());
  useEffect(() => manager.subscribe(setState), [manager]);

  const dispatch = useCallback(<K extends any>(type: K, payload?: any) => {
    (manager as any).dispatch(type, payload);
  }, [manager]);

  // CRUD helpers
  const createPrompt = useCallback((data: Omit<PromptType, 'id' | 'created_at' | 'updated_at' | 'document_id'>) => {
    const temp: PromptType = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      document_id: currentId.current,
      created_at: new Date().toISOString(),
      updated_at: null,
      title: (data as any).title,
      prompt: (data as any).prompt,
      directive: (data as any).directive,
      enabled: (data as any).enabled ?? true,
    } as PromptType;
    dispatch('CREATE_ITEM', temp);
  }, [dispatch]);

  const updatePrompt = useCallback((id: string, updates: Partial<PromptType>) => {
    dispatch('UPDATE_ITEM', { id, updates });
  }, [dispatch]);

  const deletePrompt = useCallback((id: string) => {
    dispatch('DELETE_ITEM', id);
  }, [dispatch]);

  // Load/save
  const load = useCallback(async () => {
    return (manager as any).load();
  }, [manager]);

  const save = useCallback(async () => {
    return (manager as any).save();
  }, [manager]);

  const clearAll = useCallback(() => {
    dispatch('CLEAR_GLOBAL_CONTEXT');
  }, [dispatch]);

  const discardAllChanges = useCallback(() => {
    dispatch('DISCARD_CHANGES');
  }, [dispatch]);

  // Computed
  const allPrompts = useMemo(() => manager.getAllItems(), [manager, state]);
  const hasUnsavedChanges = useMemo(() => manager.hasUnsavedChanges(), [manager, state]);
  const pendingChangesCount = useMemo(() => manager.getPendingChangesCount(), [manager, state]);
  const pendingChanges = useMemo(() => manager.getPendingChanges(), [manager, state]);

  const value: PromptContextValue = useMemo(() => ({
    state,
    dispatch,
    createPrompt,
    updatePrompt,
    deletePrompt,
    load,
    save,
    clearAll,
    discardAllChanges,
    allPrompts,
    hasUnsavedChanges,
    pendingChangesCount,
    pendingChanges,
  }), [state, dispatch, createPrompt, updatePrompt, deletePrompt, load, save, clearAll, discardAllChanges, allPrompts, hasUnsavedChanges, pendingChangesCount, pendingChanges]);

  return (
    <PromptContext.Provider value={value}>
      {children}
    </PromptContext.Provider>
  );
}

export function usePrompts() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error('usePrompts must be used within a PromptProvider');
  return ctx;
}

export default PromptProvider;

