// Domain Manager V2 - Batch Operations Behavior
// Generic batch processing capability for any domain

import { BehaviorName, type Behavior, type ActionHandlerMap, type MethodExtensionMap } from './state-types';

// =============================================================================
// BATCH OPERATIONS STATE EXTENSION
// =============================================================================

export interface BatchOperationsState {
  readonly isBatching: boolean;
}

// =============================================================================
// BATCH OPERATIONS ACTION HANDLERS  
// =============================================================================

const batchOperationsActionHandlers: ActionHandlerMap<any> = {
  START_BATCH_OPERATION: (state: any) => {
    state.isBatching = true;
  },

  FINISH_BATCH_OPERATION: (state: any) => {
    state.isBatching = false;
    // Add single history entry for the entire batch if history is available
    if (state.addToHistory && typeof state.addToHistory === 'function') {
      state.addToHistory();
    }
  },

  // Generic batch update that doesn't trigger history during batch mode
  UPDATE_ITEM_BATCH: (state: any, payload: { id: string; updates: any }) => {
    const { id, updates } = payload;
    
    // Try to find and update in persisted items (V2 naming)
    if (state.persistedItems) {
      const persistedIndex = state.persistedItems.findIndex((item: any) => 
        (state.getId ? state.getId(item) : item.id) === id
      );
      if (persistedIndex !== -1) {
        state.persistedItems[persistedIndex] = { ...state.persistedItems[persistedIndex], ...updates };
        return;
      }
    }
    
    // Try to find and update in draft items (V2 naming)
    if (state.draftItems) {
      const draftIndex = state.draftItems.findIndex((item: any) => 
        (state.getId ? state.getId(item) : item.id) === id
      );
      if (draftIndex !== -1) {
        state.draftItems[draftIndex] = { ...state.draftItems[draftIndex], ...updates };
        return;
      }
    }

    // Fallback to V1 naming for backward compatibility
    if (state.savedItems) {
      const savedIndex = state.savedItems.findIndex((item: any) => 
        (state.getId ? state.getId(item) : item.id) === id
      );
      if (savedIndex !== -1) {
        state.savedItems[savedIndex] = { ...state.savedItems[savedIndex], ...updates };
        return;
      }
    }
    
    if (state.newItems) {
      const newIndex = state.newItems.findIndex((item: any) => 
        (state.getId ? state.getId(item) : item.id) === id
      );
      if (newIndex !== -1) {
        state.newItems[newIndex] = { ...state.newItems[newIndex], ...updates };
      }
    }
  }
};

// =============================================================================
// BATCH OPERATIONS METHOD EXTENSIONS
// =============================================================================

const batchOperationsMethodExtensions: MethodExtensionMap<any> = {
  // Check if currently in batch mode
  isBatch: (state: any): boolean => !!state.isBatching,
  
  // Check if batching is supported
  supportsBatching: (): boolean => true,
  
  // Get batch status
  getBatchStatus: (state: any) => ({
    isBatching: !!state.isBatching,
    supportsBatching: true
  })
};

// =============================================================================
// BATCH OPERATIONS BEHAVIOR DEFINITION
// =============================================================================

export const batchOperationsBehavior: Behavior<any> = {
  name: BehaviorName.BATCH_OPERATIONS,
  priority: 400, // Execute after core behaviors but before UI-specific ones
  
  stateExtensions: {
    isBatching: false
  },
  
  actionHandlers: batchOperationsActionHandlers,
  methodExtensions: batchOperationsMethodExtensions,
  
  // Batch operations work well with history for single-entry batches
  dependencies: [] // No hard dependencies, but works well with history
};
