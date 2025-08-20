// Domain Manager V2 - Bulk Operations Behavior
// Generic bulk operations capability for any domain

import { BehaviorName, type Behavior, type ActionHandlerMap, type MethodExtensionMap } from './state-types';

// =============================================================================
// BULK OPERATIONS STATE EXTENSION
// =============================================================================

export interface BulkOperationsState {
  // No additional state needed - uses existing collections
}

// =============================================================================
// BULK OPERATIONS ACTION HANDLERS  
// =============================================================================

const bulkOperationsActionHandlers: ActionHandlerMap<any> = {
  // Clear all items (both persisted and drafts)
  CLEAR_ALL: (state: any) => {
    // V2 naming
    if (state.persistedItems !== undefined) {
      state.persistedItems = [];
    }
    if (state.draftItems !== undefined) {
      state.draftItems = [];
    }
    
    // V1 naming fallback
    if (state.savedItems !== undefined) {
      state.savedItems = [];
    }
    if (state.newItems !== undefined) {
      state.newItems = [];
    }
    
    // Clear any selection tracking
    if (state.selectedItemId !== undefined) {
      state.selectedItemId = null;
    }
    
    // Add to history if available and not in batch mode
    if (state.addToHistory && typeof state.addToHistory === 'function' && !state.isBatching) {
      state.addToHistory();
    }
  },

  // Clear only draft/new items
  CLEAR_DRAFTS: (state: any) => {
    // V2 naming
    if (state.draftItems !== undefined) {
      state.draftItems = [];
    }
    
    // V1 naming fallback  
    if (state.newItems !== undefined) {
      state.newItems = [];
    }
    
    // Add to history if available and not in batch mode
    if (state.addToHistory && typeof state.addToHistory === 'function' && !state.isBatching) {
      state.addToHistory();
    }
  },

  // Clear only persisted/saved items
  CLEAR_PERSISTED: (state: any) => {
    // V2 naming
    if (state.persistedItems !== undefined) {
      state.persistedItems = [];
    }
    
    // V1 naming fallback
    if (state.savedItems !== undefined) {
      state.savedItems = [];
    }
    
    // Add to history if available and not in batch mode
    if (state.addToHistory && typeof state.addToHistory === 'function' && !state.isBatching) {
      state.addToHistory();
    }
  },

  // Bulk delete by IDs
  BULK_DELETE: (state: any, payload: { ids: readonly string[] }) => {
    const { ids } = payload;
    const idsSet = new Set(ids);
    
    // V2 naming
    if (state.persistedItems !== undefined) {
      state.persistedItems = state.persistedItems.filter((item: any) => 
        !idsSet.has(state.getId ? state.getId(item) : item.id)
      );
    }
    if (state.draftItems !== undefined) {
      state.draftItems = state.draftItems.filter((item: any) => 
        !idsSet.has(state.getId ? state.getId(item) : item.id)
      );
    }
    
    // V1 naming fallback
    if (state.savedItems !== undefined) {
      state.savedItems = state.savedItems.filter((item: any) => 
        !idsSet.has(state.getId ? state.getId(item) : item.id)
      );
    }
    if (state.newItems !== undefined) {
      state.newItems = state.newItems.filter((item: any) => 
        !idsSet.has(state.getId ? state.getId(item) : item.id)
      );
    }
    
    // Clear selection if selected item was deleted
    if (state.selectedItemId && idsSet.has(state.selectedItemId)) {
      state.selectedItemId = null;
    }
    
    // Add to history if available and not in batch mode
    if (state.addToHistory && typeof state.addToHistory === 'function' && !state.isBatching) {
      state.addToHistory();
    }
  }
};

// =============================================================================
// BULK OPERATIONS METHOD EXTENSIONS
// =============================================================================

const bulkOperationsMethodExtensions: MethodExtensionMap<any> = {
  // Get all items from both collections
  getAllItems: (state: any): readonly any[] => {
    const persisted = state.persistedItems || state.savedItems || [];
    const drafts = state.draftItems || state.newItems || [];
    return [...persisted, ...drafts];
  },
  
  // Get total item count
  getItemCount: (state: any): number => {
    const persisted = state.persistedItems || state.savedItems || [];
    const drafts = state.draftItems || state.newItems || [];
    return persisted.length + drafts.length;
  },
  
  // Check if any items exist
  hasItems: (state: any): boolean => {
    const persisted = state.persistedItems || state.savedItems || [];
    const drafts = state.draftItems || state.newItems || [];
    return persisted.length > 0 || drafts.length > 0;
  },
  
  // Find item by ID across all collections
  getItemById: (state: any, id: string): any | undefined => {
    const persisted = state.persistedItems || state.savedItems || [];
    const drafts = state.draftItems || state.newItems || [];
    
    const getId = state.getId || ((item: any) => item.id);
    
    return persisted.find((item: any) => getId(item) === id) ||
           drafts.find((item: any) => getId(item) === id);
  },
  
  // Get items by predicate
  getItemsWhere: (state: any, predicate: (item: any) => boolean): readonly any[] => {
    const persisted = state.persistedItems || state.savedItems || [];
    const drafts = state.draftItems || state.newItems || [];
    return [...persisted, ...drafts].filter(predicate);
  },
  
  // Count items by predicate
  countItemsWhere: (state: any, predicate: (item: any) => boolean): number => {
    const persisted = state.persistedItems || state.savedItems || [];
    const drafts = state.draftItems || state.newItems || [];
    return [...persisted, ...drafts].filter(predicate).length;
  }
};

// =============================================================================
// BULK OPERATIONS BEHAVIOR DEFINITION
// =============================================================================

export const bulkOperationsBehavior: Behavior<any> = {
  name: BehaviorName.BULK_OPERATIONS,
  priority: 300, // Execute after core behaviors
  
  stateExtensions: {
    // No additional state needed
  },
  
  actionHandlers: bulkOperationsActionHandlers,
  methodExtensions: bulkOperationsMethodExtensions,
  
  // Bulk operations work well with history and CRUD
  dependencies: [] // No hard dependencies
};
