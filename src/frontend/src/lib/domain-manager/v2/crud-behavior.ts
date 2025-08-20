// Domain Manager V2 - CRUD Behavior Implementation
// Priority: 2 - Core data operations and state management

import type { Behavior, CoreDomainState } from './state-types';
import { BehaviorName } from './state-types';
import { CrudActionType } from './action-types';

// =============================================================================
// CRUD BEHAVIOR
// =============================================================================

export const crudBehavior: Behavior<CoreDomainState<any>> = {
  name: BehaviorName.CRUD,
  priority: 2,
  stateExtensions: {
    // Uses core state only - no additional extensions needed
  },
  dependencies: [],
  
  actionHandlers: {
    // Loading states
    [CrudActionType.SET_LOADING]: (state, isLoading: boolean) => {
      (state as any).isLoading = isLoading;
    },
    
    [CrudActionType.SET_SAVING]: (state, isSaving: boolean) => {
      (state as any).isSaving = isSaving;
    },
    
    [CrudActionType.SET_CREATING]: (state, isCreating: boolean) => {
      (state as any).isCreating = isCreating;
    },
    
    [CrudActionType.SET_ERROR]: (state, error: string | null) => {
      (state as any).error = error;
    },
    
    // Basic CRUD operations
    [CrudActionType.LOAD_ITEMS]: (state, items: ReadonlyArray<any>) => {
      (state as any).persistedItems = [...items];
      (state as any).isLoading = false;
    },
    
    [CrudActionType.CREATE_ITEM]: (state, item: any) => {
      (state as any).draftItems = [...state.draftItems, item];
    },
    
    [CrudActionType.UPDATE_ITEM]: (state, { id, updates }: { id: string; updates: Partial<any> }) => {
      // Try to update in persistedItems first
      const persistedIndex = state.persistedItems.findIndex((item: any) => 
        item.id === id
      );
      
      if (persistedIndex !== -1) {
        const updatedPersisted = [...state.persistedItems];
        updatedPersisted[persistedIndex] = { ...updatedPersisted[persistedIndex], ...updates };
        (state as any).persistedItems = updatedPersisted;
        return;
      }
      
      // Try to update in draftItems
      const draftIndex = state.draftItems.findIndex((item: any) => 
        item.id === id
      );
      
      if (draftIndex !== -1) {
        const updatedDrafts = [...state.draftItems];
        updatedDrafts[draftIndex] = { ...updatedDrafts[draftIndex], ...updates };
        (state as any).draftItems = updatedDrafts;
      }
    },
    
    [CrudActionType.DELETE_ITEM]: (state, id: string) => {
      // Remove from both arrays
      (state as any).draftItems = state.draftItems.filter((item: any) => item.id !== id);
      (state as any).persistedItems = state.persistedItems.filter((item: any) => item.id !== id);
    },
    
    // Bulk operations
    [CrudActionType.CREATE_ITEMS]: (state, items: ReadonlyArray<any>) => {
      (state as any).draftItems = [...state.draftItems, ...items];
    },
    
    [CrudActionType.UPDATE_ITEMS]: (state, updates: ReadonlyArray<{ id: string; updates: Partial<any> }>) => {
      updates.forEach(({ id, updates: itemUpdates }) => {
        // Apply same logic as single UPDATE_ITEM
        const persistedIndex = state.persistedItems.findIndex((item: any) => item.id === id);
        if (persistedIndex !== -1) {
          const updatedPersisted = [...state.persistedItems];
          updatedPersisted[persistedIndex] = { ...updatedPersisted[persistedIndex], ...itemUpdates };
          (state as any).persistedItems = updatedPersisted;
          return;
        }
        
        const draftIndex = state.draftItems.findIndex((item: any) => item.id === id);
        if (draftIndex !== -1) {
          const updatedDrafts = [...state.draftItems];
          updatedDrafts[draftIndex] = { ...updatedDrafts[draftIndex], ...itemUpdates };
          (state as any).draftItems = updatedDrafts;
        }
      });
    },
    
    [CrudActionType.DELETE_ITEMS]: (state, ids: ReadonlyArray<string>) => {
      const idSet = new Set(ids);
      (state as any).draftItems = state.draftItems.filter((item: any) => !idSet.has(item.id));
      (state as any).persistedItems = state.persistedItems.filter((item: any) => !idSet.has(item.id));
    },
    
    // Context operations (generic clear operations)
    [CrudActionType.CLEAR_GLOBAL_CONTEXT]: (state) => {
      // Clear all items regardless of context
      (state as any).draftItems = [];
      (state as any).persistedItems = [];
    },
    
    [CrudActionType.CLEAR_LOCAL_CONTEXT]: (state, { contextFilter }: { contextFilter?: string }) => {
      if (!contextFilter) {
        // If no filter provided, clear all (same as global)
        (state as any).draftItems = [];
        (state as any).persistedItems = [];
        return;
      }
      
      // Filter by context - implementation depends on item structure
      // For now, we assume items have a context property or similar
      const filterPredicate = (item: any) => {
        // This is a generic implementation - specific domains can override
        // Common patterns: item.page, item.context, item.category, etc.
        if ('page' in item) return item.page !== contextFilter;
        if ('context' in item) return item.context !== contextFilter;
        if ('category' in item) return item.category !== contextFilter;
        return true; // Keep item if no recognizable context property
      };
      
      (state as any).draftItems = state.draftItems.filter(filterPredicate);
      (state as any).persistedItems = state.persistedItems.filter(filterPredicate);
    }
  },
  
  methodExtensions: {
    // Core item operations
    getAllItems: (state: CoreDomainState<any>) => 
      [...state.persistedItems, ...state.draftItems],
    
    getItemById: (state: CoreDomainState<any>, id: string) =>
      state.persistedItems.find((item: any) => item.id === id) ||
      state.draftItems.find((item: any) => item.id === id),
    
    getItemCount: (state: CoreDomainState<any>) =>
      state.persistedItems.length + state.draftItems.length,
    
    hasItems: (state: CoreDomainState<any>) =>
      state.persistedItems.length > 0 || state.draftItems.length > 0,
    
    // Separate accessors for persisted vs draft items
    getPersistedItems: (state: CoreDomainState<any>) =>
      state.persistedItems,
    
    getDraftItems: (state: CoreDomainState<any>) =>
      state.draftItems
  }
};
