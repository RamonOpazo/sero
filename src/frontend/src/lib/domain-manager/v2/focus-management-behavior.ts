// Domain Manager V2 - Focus Management Behavior Implementation
// Priority: 5 - Track focused items for UI interaction

import type { Behavior, CoreDomainState } from './state-types';
import { BehaviorName } from './state-types';
import { FocusActionType, CrudActionType } from './action-types';

// =============================================================================
// FOCUS MANAGEMENT STATE EXTENSION
// =============================================================================

interface FocusManagementState {
  readonly focusedItemId: string | null;
  readonly focusedItemIds: ReadonlySet<string>;
  readonly lastFocusedTimestamp: number;
}

// =============================================================================
// FOCUS MANAGEMENT BEHAVIOR
// =============================================================================

export const focusManagementBehavior: Behavior<CoreDomainState<any> & FocusManagementState> = {
  name: BehaviorName.FOCUS_MANAGEMENT,
  priority: 5,
  stateExtensions: {
    focusedItemId: null,
    focusedItemIds: new Set<string>(),
    lastFocusedTimestamp: 0
  },
  dependencies: [BehaviorName.CRUD],
  
  actionHandlers: {
    [FocusActionType.SET_FOCUSED_ITEM]: (state, itemId: string | null, context) => {
      (state as any).focusedItemId = itemId;
      (state as any).lastFocusedTimestamp = context.timestamp;
      
      // Update the focused items set
      const newFocusedIds = new Set<string>();
      if (itemId !== null) {
        newFocusedIds.add(itemId);
      }
      (state as any).focusedItemIds = newFocusedIds;
    },
    
    [FocusActionType.CLEAR_FOCUSED_ITEM]: (state, _, context) => {
      (state as any).focusedItemId = null;
      (state as any).focusedItemIds = new Set<string>();
      (state as any).lastFocusedTimestamp = context.timestamp;
    },
    
    [FocusActionType.SET_FOCUSED_ITEMS]: (state, itemIds: ReadonlyArray<string>, context) => {
      const newFocusedIds = new Set(itemIds);
      (state as any).focusedItemIds = newFocusedIds;
      (state as any).lastFocusedTimestamp = context.timestamp;
      
      // Set single focused item to the last one if any, otherwise null
      if (itemIds.length > 0) {
        (state as any).focusedItemId = itemIds[itemIds.length - 1];
      } else {
        (state as any).focusedItemId = null;
      }
    },
    
    [FocusActionType.TOGGLE_ITEM_FOCUS]: (state, itemId: string, context) => {
      const newFocusedIds = new Set(state.focusedItemIds);
      
      if (newFocusedIds.has(itemId)) {
        // Remove from focus
        newFocusedIds.delete(itemId);
        
        // Update single focused item
        if (state.focusedItemId === itemId) {
          // Set to another focused item if available, otherwise null
          const remainingItems = Array.from(newFocusedIds);
          (state as any).focusedItemId = remainingItems.length > 0 ? remainingItems[0] : null;
        }
      } else {
        // Add to focus
        newFocusedIds.add(itemId);
        (state as any).focusedItemId = itemId; // Make it the primary focused item
      }
      
      (state as any).focusedItemIds = newFocusedIds;
      (state as any).lastFocusedTimestamp = context.timestamp;
    },
    
    // Auto-clear focus when items are deleted
    [CrudActionType.DELETE_ITEM]: (state, id: string) => {
      if (state.focusedItemId === id) {
        (state as any).focusedItemId = null;
      }
      
      if (state.focusedItemIds.has(id)) {
        const newFocusedIds = new Set(state.focusedItemIds);
        newFocusedIds.delete(id);
        (state as any).focusedItemIds = newFocusedIds;
      }
    },
    
    [CrudActionType.DELETE_ITEMS]: (state, ids: ReadonlyArray<string>) => {
      const idSet = new Set(ids);
      
      // Clear single focused item if it's being deleted
      if (state.focusedItemId && idSet.has(state.focusedItemId)) {
        (state as any).focusedItemId = null;
      }
      
      // Remove deleted items from focused items set
      const newFocusedIds = new Set<string>();
      state.focusedItemIds.forEach(id => {
        if (!idSet.has(id)) {
          newFocusedIds.add(id);
        }
      });
      (state as any).focusedItemIds = newFocusedIds;
      
      // Update single focused item if it was cleared but other items remain focused
      if (!state.focusedItemId && newFocusedIds.size > 0) {
        (state as any).focusedItemId = Array.from(newFocusedIds)[0];
      }
    },
    
    [CrudActionType.CLEAR_GLOBAL_CONTEXT]: (state) => {
      (state as any).focusedItemId = null;
      (state as any).focusedItemIds = new Set<string>();
    },
    
    [CrudActionType.CLEAR_LOCAL_CONTEXT]: (state, { contextFilter }) => {
      if (!contextFilter) {
        // No filter = clear all focus
        (state as any).focusedItemId = null;
        (state as any).focusedItemIds = new Set<string>();
        return;
      }
      
      // Check if focused items match the context filter
      const shouldClearFocus = (item: any) => {
        if ('page' in item) return item.page === contextFilter;
        if ('context' in item) return item.context === contextFilter;
        if ('category' in item) return item.category === contextFilter;
        return false;
      };
      
      // Clear single focused item if it matches the filter
      if (state.focusedItemId) {
        const focusedItem = state.persistedItems.find((item: any) => item.id === state.focusedItemId) ||
                           state.draftItems.find((item: any) => item.id === state.focusedItemId);
        if (focusedItem && shouldClearFocus(focusedItem)) {
          (state as any).focusedItemId = null;
        }
      }
      
      // Clear matching items from focused set
      const newFocusedIds = new Set<string>();
      state.focusedItemIds.forEach(id => {
        const item = state.persistedItems.find((item: any) => item.id === id) ||
                    state.draftItems.find((item: any) => item.id === id);
        if (!item || !shouldClearFocus(item)) {
          newFocusedIds.add(id);
        }
      });
      (state as any).focusedItemIds = newFocusedIds;
      
      // Update single focused item if it was cleared but other items remain focused
      if (!state.focusedItemId && newFocusedIds.size > 0) {
        (state as any).focusedItemId = Array.from(newFocusedIds)[0];
      }
    }
  },
  
  methodExtensions: {
    getFocusedItem: (state: CoreDomainState<any> & FocusManagementState) => {
      if (!state.focusedItemId) return null;
      
      return state.persistedItems.find((item: any) => item.id === state.focusedItemId) ||
             state.draftItems.find((item: any) => item.id === state.focusedItemId) ||
             null;
    },
    
    getFocusedItems: (state: CoreDomainState<any> & FocusManagementState): ReadonlyArray<any> => {
      const focusedItems: any[] = [];
      
      state.focusedItemIds.forEach(id => {
        const item = state.persistedItems.find((item: any) => item.id === id) ||
                    state.draftItems.find((item: any) => item.id === id);
        if (item) {
          focusedItems.push(item);
        }
      });
      
      return focusedItems;
    },
    
    isFocused: (state: CoreDomainState<any> & FocusManagementState, itemId: string): boolean => {
      return state.focusedItemIds.has(itemId);
    },
    
    getFocusCount: (state: CoreDomainState<any> & FocusManagementState): number => {
      return state.focusedItemIds.size;
    },
    
    hasFocus: (state: CoreDomainState<any> & FocusManagementState): boolean => {
      return state.focusedItemId !== null || state.focusedItemIds.size > 0;
    },
    
    getFocusedItemId: (state: CoreDomainState<any> & FocusManagementState): string | null => {
      return state.focusedItemId;
    },
    
    getFocusedItemIds: (state: CoreDomainState<any> & FocusManagementState): ReadonlyArray<string> => {
      return Array.from(state.focusedItemIds);
    },
    
    getLastFocusedTimestamp: (state: CoreDomainState<any> & FocusManagementState): number => {
      return state.lastFocusedTimestamp;
    }
  }
};
