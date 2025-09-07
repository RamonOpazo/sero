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
  BEGIN_BATCH: (state: any) => {
    state.isBatching = true;
  },

  END_BATCH: (state: any) => {
    state.isBatching = false;
    // Add single history entry for the entire batch if history is available
    if (state.addToHistory && typeof state.addToHistory === 'function') {
      state.addToHistory();
    }
  },

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
