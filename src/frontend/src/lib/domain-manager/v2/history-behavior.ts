// Domain Manager V2 - History Behavior Implementation
// Priority: 9 - Undo/Redo functionality (executes after state changes)

import type { Behavior, CoreDomainState } from './state-types';
import { BehaviorName } from './state-types';
import { HistoryActionType, ChangeType, type HistoryRecord } from './action-types';

// =============================================================================
// HISTORY STATE EXTENSION
// =============================================================================

interface HistoryState<TItem> {
  readonly changeHistory: ReadonlyArray<HistoryRecord<TItem>>;
  readonly currentHistoryIndex: number; // Points to the last applied change (-1 = no changes)
  readonly isUndoRedoOperation: boolean; // Flag to prevent history recording during undo/redo
  readonly maxHistorySize: number;
}

// =============================================================================
// HISTORY BEHAVIOR
// =============================================================================

export const historyBehavior: Behavior<CoreDomainState<any> & HistoryState<any>> = {
  name: BehaviorName.HISTORY,
  priority: 9,
  stateExtensions: {
    changeHistory: [],
    currentHistoryIndex: -1,
    isUndoRedoOperation: false,
    maxHistorySize: 100
  },
  dependencies: [BehaviorName.CRUD, BehaviorName.CHANGE_TRACKING],
  
  actionHandlers: {
    [HistoryActionType.UNDO]: (state) => {
      if (state.currentHistoryIndex >= 0) {
        const change = state.changeHistory[state.currentHistoryIndex];
        
        // Set flag to prevent history recording during undo
        (state as any).isUndoRedoOperation = true;
        
        // Reverse the change
        switch (change.type) {
          case ChangeType.CREATE:
            // Remove the created item
            if (change.item) {
              (state as any).draftItems = state.draftItems.filter((item: any) => item.id !== change.item?.id);
              (state as any).persistedItems = state.persistedItems.filter((item: any) => item.id !== change.item?.id);
            }
            break;
            
          case ChangeType.UPDATE:
            // Restore previous values
            if (change.itemId && change.previousValues) {
              const persistedIndex = state.persistedItems.findIndex((item: any) => item.id === change.itemId);
              if (persistedIndex !== -1) {
                const updatedPersisted = [...state.persistedItems];
                updatedPersisted[persistedIndex] = { ...updatedPersisted[persistedIndex], ...change.previousValues };
                (state as any).persistedItems = updatedPersisted;
              }
              
              const draftIndex = state.draftItems.findIndex((item: any) => item.id === change.itemId);
              if (draftIndex !== -1) {
                const updatedDrafts = [...state.draftItems];
                updatedDrafts[draftIndex] = { ...updatedDrafts[draftIndex], ...change.previousValues };
                (state as any).draftItems = updatedDrafts;
              }
            }
            break;
            
          case ChangeType.DELETE:
            // Restore the deleted item
            if (change.item) {
              // Determine if it was originally a persisted or draft item
              // Heuristic: if it has created_at and updated_at, it was persisted
              if ('created_at' in change.item && 'updated_at' in change.item && change.item.updated_at !== null) {
                (state as any).persistedItems = [...state.persistedItems, change.item];
              } else {
                (state as any).draftItems = [...state.draftItems, change.item];
              }
            }
            break;
            
          case ChangeType.BULK_DELETE:
          case ChangeType.CONTEXT_CLEAR:
            // Restore all cleared items
            if (change.items) {
              // Split items back to persisted/draft based on their characteristics
              change.items.forEach((item: any) => {
                if ('created_at' in item && 'updated_at' in item && item.updated_at !== null) {
                  (state as any).persistedItems = [...state.persistedItems, item];
                } else {
                  (state as any).draftItems = [...state.draftItems, item];
                }
              });
            }
            break;
        }
        
        (state as any).currentHistoryIndex = state.currentHistoryIndex - 1;
        
        // Reset flag after undo is complete
        (state as any).isUndoRedoOperation = false;
      }
    },
    
    [HistoryActionType.REDO]: (state) => {
      if (state.currentHistoryIndex < state.changeHistory.length - 1) {
        const nextIndex = state.currentHistoryIndex + 1;
        const change = state.changeHistory[nextIndex];
        
        // Set flag to prevent history recording during redo
        (state as any).isUndoRedoOperation = true;
        
        // Reapply the change
        switch (change.type) {
          case ChangeType.CREATE:
            // Re-add the item
            if (change.item) {
              (state as any).draftItems = [...state.draftItems, change.item];
            }
            break;
            
          case ChangeType.UPDATE:
            // Reapply the update
            if (change.itemId && change.newValues) {
              const persistedIndex = state.persistedItems.findIndex((item: any) => item.id === change.itemId);
              if (persistedIndex !== -1) {
                const updatedPersisted = [...state.persistedItems];
                updatedPersisted[persistedIndex] = { ...updatedPersisted[persistedIndex], ...change.newValues };
                (state as any).persistedItems = updatedPersisted;
              }
              
              const draftIndex = state.draftItems.findIndex((item: any) => item.id === change.itemId);
              if (draftIndex !== -1) {
                const updatedDrafts = [...state.draftItems];
                updatedDrafts[draftIndex] = { ...updatedDrafts[draftIndex], ...change.newValues };
                (state as any).draftItems = updatedDrafts;
              }
            }
            break;
            
          case ChangeType.DELETE:
            // Re-delete the item
            if (change.item) {
              (state as any).persistedItems = state.persistedItems.filter((item: any) => item.id !== change.item?.id);
              (state as any).draftItems = state.draftItems.filter((item: any) => item.id !== change.item?.id);
            }
            break;
            
          case ChangeType.BULK_DELETE:
          case ChangeType.CONTEXT_CLEAR:
            // Re-clear all items
            (state as any).persistedItems = [];
            (state as any).draftItems = [];
            break;
        }
        
        (state as any).currentHistoryIndex = nextIndex;
        
        // Reset flag after redo is complete
        (state as any).isUndoRedoOperation = false;
      }
    },
    
    [HistoryActionType.RECORD_CHANGE]: (state, change: HistoryRecord<any>) => {
      // Don't record if we're in an undo/redo operation
      if (state.isUndoRedoOperation) return;
      
      // Truncate future history if we're in the middle
      let newHistory = [...state.changeHistory];
      if (state.currentHistoryIndex < newHistory.length - 1) {
        newHistory = newHistory.slice(0, state.currentHistoryIndex + 1);
      }
      
      // Add new change
      newHistory.push(change);
      
      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
        (state as any).currentHistoryIndex = state.maxHistorySize - 1;
      } else {
        (state as any).currentHistoryIndex = state.currentHistoryIndex + 1;
      }
      
      (state as any).changeHistory = newHistory;
    },
    
    [HistoryActionType.CLEAR_HISTORY]: (state) => {
      (state as any).changeHistory = [];
      (state as any).currentHistoryIndex = -1;
    },
    
    [HistoryActionType.TRUNCATE_HISTORY]: (state, maxSize: number) => {
      if (maxSize <= 0) {
        (state as any).changeHistory = [];
        (state as any).currentHistoryIndex = -1;
        return;
      }
      
      const history = [...state.changeHistory];
      if (history.length > maxSize) {
        const truncated = history.slice(-maxSize);
        (state as any).changeHistory = truncated;
        (state as any).currentHistoryIndex = Math.min(state.currentHistoryIndex, maxSize - 1);
      }
      
      (state as any).maxHistorySize = maxSize;
    }
  },
  
  methodExtensions: {
    canUndo: (state: CoreDomainState<any> & HistoryState<any>): boolean => {
      return state.currentHistoryIndex >= 0;
    },
    
    canRedo: (state: CoreDomainState<any> & HistoryState<any>): boolean => {
      return state.currentHistoryIndex < state.changeHistory.length - 1;
    },
    
    getHistorySize: (state: CoreDomainState<any> & HistoryState<any>): number => {
      return state.changeHistory.length;
    },
    
    getHistoryPosition: (state: CoreDomainState<any> & HistoryState<any>): number => {
      return state.currentHistoryIndex + 1; // Convert to 1-based index for display
    },
    
    recordHistoryChange: (state: CoreDomainState<any> & HistoryState<any>, change: HistoryRecord<any>) => {
      // Use the dispatch system to record the change
      if ('dispatch' in state) {
        (state as any).dispatch(HistoryActionType.RECORD_CHANGE, change);
      }
    },
    
    getChangeHistory: (state: CoreDomainState<any> & HistoryState<any>) => {
      return state.changeHistory;
    },
    
    isUndoRedoInProgress: (state: CoreDomainState<any> & HistoryState<any>): boolean => {
      return state.isUndoRedoOperation;
    }
  }
};
