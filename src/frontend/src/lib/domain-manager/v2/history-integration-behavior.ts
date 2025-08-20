// Domain Manager V2 - History Integration Behavior Implementation
// Priority: 1 - Record changes for history tracking (executes before state changes)

import type { Behavior, CoreDomainState } from './state-types';
import { BehaviorName } from './state-types';
import { CrudActionType, ChangeType, ActionSource, type HistoryRecord } from './action-types';

// =============================================================================
// HISTORY INTEGRATION BEHAVIOR
// =============================================================================

export const historyIntegrationBehavior: Behavior<CoreDomainState<any>> = {
  name: BehaviorName.HISTORY_INTEGRATION,
  priority: 1, // Execute first to capture before-state
  stateExtensions: {
    // No additional state extensions needed
  },
  dependencies: [BehaviorName.HISTORY],
  
  actionHandlers: {
    // Intercept CREATE_ITEM to record history
    [CrudActionType.CREATE_ITEM]: (state, item: any, context) => {
      // Don't record if this is from an undo/redo operation
      if (context.source === ActionSource.UNDO_REDO || (state as any).isUndoRedoOperation) {
        return;
      }
      
      // Record the create change
      if ((state as any).recordHistoryChange) {
        const change: HistoryRecord<any> = {
          type: ChangeType.CREATE,
          item,
          timestamp: context.timestamp
        };
        (state as any).recordHistoryChange(change);
      }
    },
    
    // Intercept UPDATE_ITEM to record history
    [CrudActionType.UPDATE_ITEM]: (state, { id, updates }, context) => {
      // Don't record if this is from an undo/redo operation OR if batching suppresses granular updates
      if (
        context.source === ActionSource.UNDO_REDO ||
        (state as any).isUndoRedoOperation ||
        (state as any).isBatchOperation ||
        (state as any).suppressUpdateHistory
      ) {
        return;
      }
      
      // Get the current values before updating (since we run before CRUD)
      const currentItem = state.persistedItems.find((item: any) => item.id === id) ||
                         state.draftItems.find((item: any) => item.id === id);
      
      if (currentItem && (state as any).recordHistoryChange) {
        // Extract only the fields that are being updated
        const previousValues: Record<string, any> = {};
        for (const key in updates) {
          if (key in currentItem) {
            previousValues[key] = currentItem[key];
          }
        }
        
        const change: HistoryRecord<any> = {
          type: ChangeType.UPDATE,
          itemId: id,
          previousValues,
          newValues: updates,
          timestamp: context.timestamp
        };
        (state as any).recordHistoryChange(change);
      }
    },
    
    // Intercept DELETE_ITEM to record history
    [CrudActionType.DELETE_ITEM]: (state, id: string, context) => {
      // Don't record if this is from an undo/redo operation
      if (context.source === ActionSource.UNDO_REDO || (state as any).isUndoRedoOperation) {
        return;
      }
      
      // Find the item being deleted (since we run before CRUD)
      const itemToDelete = state.persistedItems.find((item: any) => item.id === id) ||
                          state.draftItems.find((item: any) => item.id === id);
      
      if (itemToDelete && (state as any).recordHistoryChange) {
        const change: HistoryRecord<any> = {
          type: ChangeType.DELETE,
          item: itemToDelete,
          timestamp: context.timestamp
        };
        (state as any).recordHistoryChange(change);
      }
    },
    
    // Intercept DELETE_ITEMS to record history
    [CrudActionType.DELETE_ITEMS]: (state, ids: ReadonlyArray<string>, context) => {
      // Don't record if this is from an undo/redo operation
      if (context.source === ActionSource.UNDO_REDO || (state as any).isUndoRedoOperation) {
        return;
      }
      
      // Find all items being deleted
      const idSet = new Set(ids);
      const itemsToDelete = [
        ...state.persistedItems.filter((item: any) => idSet.has(item.id)),
        ...state.draftItems.filter((item: any) => idSet.has(item.id))
      ];
      
      if (itemsToDelete.length > 0 && (state as any).recordHistoryChange) {
        const change: HistoryRecord<any> = {
          type: ChangeType.BULK_DELETE,
          items: itemsToDelete,
          timestamp: context.timestamp
        };
        (state as any).recordHistoryChange(change);
      }
    },
    
    // Intercept CLEAR_GLOBAL_CONTEXT to record history
    [CrudActionType.CLEAR_GLOBAL_CONTEXT]: (state, _, context) => {
      // Don't record if this is from an undo/redo operation
      if (context.source === ActionSource.UNDO_REDO || (state as any).isUndoRedoOperation) {
        return;
      }
      
      // Record bulk clear change (since we run before CRUD)
      const allItems = [...state.persistedItems, ...state.draftItems];
      if (allItems.length > 0 && (state as any).recordHistoryChange) {
        const change: HistoryRecord<any> = {
          type: ChangeType.CONTEXT_CLEAR,
          items: allItems,
          timestamp: context.timestamp
        };
        (state as any).recordHistoryChange(change);
      }
    },
    
    // Intercept CLEAR_LOCAL_CONTEXT to record history
    [CrudActionType.CLEAR_LOCAL_CONTEXT]: (state, { contextFilter }, context) => {
      // Don't record if this is from an undo/redo operation
      if (context.source === ActionSource.UNDO_REDO || (state as any).isUndoRedoOperation) {
        return;
      }
      
      // Determine which items will be cleared based on context filter
      let itemsToDelete: any[] = [];
      
      if (!contextFilter) {
        // No filter = clear all
        itemsToDelete = [...state.persistedItems, ...state.draftItems];
      } else {
        // Filter by context - same logic as in CRUD behavior
        const filterPredicate = (item: any) => {
          if ('page' in item) return item.page === contextFilter;
          if ('context' in item) return item.context === contextFilter;
          if ('category' in item) return item.category === contextFilter;
          return false; // Don't delete if no recognizable context property
        };
        
        itemsToDelete = [
          ...state.persistedItems.filter(filterPredicate),
          ...state.draftItems.filter(filterPredicate)
        ];
      }
      
      if (itemsToDelete.length > 0 && (state as any).recordHistoryChange) {
        const change: HistoryRecord<any> = {
          type: ChangeType.CONTEXT_CLEAR,
          items: itemsToDelete,
          contextFilter,
          timestamp: context.timestamp
        };
        (state as any).recordHistoryChange(change);
      }
    }
  },
  
  methodExtensions: {
    // No additional methods needed - this behavior only intercepts actions
  }
};
