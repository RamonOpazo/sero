// Domain Manager Behaviors Library
import type { Behavior, StateSnapshot, PendingChanges } from './types';
// Simple deep equality check (replace with library if needed)
const deepEqual = (a: any, b: any): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// =============================================================================
// BEHAVIOR 1: CRUD OPERATIONS
// =============================================================================

export const crudBehavior: Behavior = {
  name: 'crud',
  stateExtensions: {
    // Core state is already in CoreState interface
  },
  actionHandlers: {
    SET_LOADING: (state, payload: boolean) => {
      state.isLoading = payload;
    },
    SET_SAVING: (state, payload: boolean) => {
      state.isSaving = payload;
    },
    SET_CREATING: (state, payload: boolean) => {
      state.isCreating = payload;
    },
    SET_ERROR: (state, payload: string | null) => {
      state.error = payload;
    },
    LOAD_SAVED_ITEMS: (state, payload: any[]) => {
      state.savedItems = payload;
      state.isLoading = false;
    },
    ADD_ITEM: (state, payload: any) => {
      state.newItems.push(payload);
    },
    UPDATE_ITEM: (state, payload: { id: string; updates: Partial<any> }) => {
      const { id, updates } = payload;
      
      // Try to update in savedItems first
      const savedIndex = state.savedItems.findIndex((item: any) => item.id === id);
      if (savedIndex !== -1) {
        state.savedItems[savedIndex] = { ...state.savedItems[savedIndex], ...updates };
        return;
      }
      
      // Try to update in newItems
      const newIndex = state.newItems.findIndex((item: any) => item.id === id);
      if (newIndex !== -1) {
        state.newItems[newIndex] = { ...state.newItems[newIndex], ...updates };
      }
    },
    DELETE_ITEM: (state, payload: string) => {
      const id = payload;
      
      // Remove from newItems
      state.newItems = state.newItems.filter((item: any) => item.id !== id);
      
      // Remove from savedItems
      state.savedItems = state.savedItems.filter((item: any) => item.id !== id);
    }
  },
  methodExtensions: {
    getAllItems: (state) => [...state.savedItems, ...state.newItems],
    getItemById: (state, id: string) => {
      return state.savedItems.find((item: any) => item.id === id) || 
             state.newItems.find((item: any) => item.id === id);
    },
    getItemCount: (state) => state.savedItems.length + state.newItems.length,
    hasItems: (state) => state.savedItems.length > 0 || state.newItems.length > 0
  }
};

// =============================================================================
// BEHAVIOR 2: CHANGE TRACKING
// =============================================================================

export const changeTrackingBehavior: Behavior = {
  name: 'changeTracking',
  stateExtensions: {
    // initialState is already in CoreState
  },
  actionHandlers: {
    CAPTURE_INITIAL_STATE: (state) => {
      state.initialState = {
        savedItems: [...state.savedItems],
        newItems: [...state.newItems],
        timestamp: Date.now()
      };
    },
    COMMIT_CHANGES: (state) => {
      // Update initial state to current state
      state.initialState = {
        savedItems: [...state.savedItems],
        newItems: [...state.newItems],
        timestamp: Date.now()
      };
    },
    DISCARD_ALL_CHANGES: (state) => {
      // Restore to initial state
      state.savedItems = [...state.initialState.savedItems];
      state.newItems = [...state.initialState.newItems];
    }
  },
  methodExtensions: {
    getPendingChanges: (state): PendingChanges<any> => {
      const creates = [...state.newItems];
      
      // Find updates: saved items that differ from initial state
      const updates = state.savedItems.filter((current: any) => {
        const initial = state.initialState.savedItems.find((i: any) => i.id === current.id);
        return initial && !deepEqual(current, initial);
      });
      
      // Find deletes: items in initial state but not in current
      const deletes = state.initialState.savedItems.filter((initial: any) => {
        return !state.savedItems.find((current: any) => current.id === initial.id);
      });
      
      return { creates, updates, deletes };
    },
    getPendingChangesCount: (state) => {
      const changes = state.getPendingChanges();
      return changes.creates.length + changes.updates.length + changes.deletes.length;
    },
    hasUnsavedChanges: (state) => state.getPendingChangesCount() > 0
  }
};

// =============================================================================
// BEHAVIOR 3: HISTORY MANAGEMENT
// =============================================================================

export const historyBehavior: Behavior = {
  name: 'history',
  stateExtensions: {
    changeHistory: [] as StateSnapshot<any>[],
    currentHistoryIndex: -1
  },
  actionHandlers: {
    ADD_TO_HISTORY: (state, payload: StateSnapshot<any>) => {
      // Truncate future history if we're not at the end
      if (state.currentHistoryIndex < state.changeHistory.length - 1) {
        state.changeHistory = state.changeHistory.slice(0, state.currentHistoryIndex + 1);
      }
      
      // Add new snapshot
      state.changeHistory.push(payload);
      
      // Limit history to 50 items
      if (state.changeHistory.length > 50) {
        state.changeHistory.shift();
      } else {
        state.currentHistoryIndex++;
      }
    },
    UNDO: (state) => {
      if (state.currentHistoryIndex > 0) {
        state.currentHistoryIndex--;
        const snapshot = state.changeHistory[state.currentHistoryIndex];
        state.savedItems = [...snapshot.savedItems];
        state.newItems = [...snapshot.newItems];
      }
    },
    REDO: (state) => {
      if (state.currentHistoryIndex < state.changeHistory.length - 1) {
        state.currentHistoryIndex++;
        const snapshot = state.changeHistory[state.currentHistoryIndex];
        state.savedItems = [...snapshot.savedItems];
        state.newItems = [...snapshot.newItems];
      }
    }
  },
  methodExtensions: {
    canUndo: (state) => state.currentHistoryIndex > 0,
    canRedo: (state) => state.currentHistoryIndex < state.changeHistory.length - 1,
    addToHistory: (state) => {
      const snapshot: StateSnapshot<any> = {
        savedItems: [...state.savedItems],
        newItems: [...state.newItems],
        timestamp: Date.now()
      };
      state.dispatch({ type: 'ADD_TO_HISTORY', payload: snapshot });
    }
  }
};

// =============================================================================
// BEHAVIOR 4: DRAWING STATE
// =============================================================================

export const drawingBehavior: Behavior = {
  name: 'drawing',
  stateExtensions: {
    currentDraw: null as any,
    isDrawing: false
  },
  actionHandlers: {
    START_DRAW: (state, payload: any) => {
      state.currentDraw = payload;
      state.isDrawing = true;
      // Clear selection when starting to draw
      if (state.selectedItemId !== undefined) {
        state.selectedItemId = null;
      }
    },
    UPDATE_DRAW: (state, payload: any) => {
      if (state.isDrawing) {
        state.currentDraw = payload;
      }
    },
    FINISH_DRAW: (state) => {
      if (state.isDrawing && state.currentDraw) {
        // Generate ID and add to items
        const itemWithId = {
          ...state.currentDraw,
          id: `${state.entityName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        state.newItems.push(itemWithId);
        
        // Clear drawing state
        state.currentDraw = null;
        state.isDrawing = false;
      }
    },
    CANCEL_DRAW: (state) => {
      state.currentDraw = null;
      state.isDrawing = false;
    }
  },
  methodExtensions: {
    getCurrentDraw: (state) => state.currentDraw,
    isCurrentlyDrawing: (state) => state.isDrawing
  }
};

// =============================================================================
// BEHAVIOR 5: SELECTION TRACKING
// =============================================================================

export const selectionBehavior: Behavior = {
  name: 'selection',
  stateExtensions: {
    selectedItemId: null as string | null
  },
  actionHandlers: {
    SELECT_ITEM: (state, payload: string | null) => {
      state.selectedItemId = payload;
    },
    CLEAR_SELECTION: (state) => {
      state.selectedItemId = null;
    },
    // Auto-clear selection when item is deleted
    DELETE_ITEM: (state, payload: string) => {
      if (state.selectedItemId === payload) {
        state.selectedItemId = null;
      }
    }
  },
  methodExtensions: {
    getSelectedItem: (state) => {
      if (!state.selectedItemId) return null;
      return state.savedItems.find((item: any) => item.id === state.selectedItemId) ||
             state.newItems.find((item: any) => item.id === state.selectedItemId) ||
             null;
    }
  }
};

// =============================================================================
// BEHAVIOR 6: BATCH OPERATIONS
// =============================================================================

export const batchOperationsBehavior: Behavior = {
  name: 'batchOperations',
  stateExtensions: {
    isBatchOperation: false
  },
  actionHandlers: {
    START_BATCH_OPERATION: (state) => {
      state.isBatchOperation = true;
    },
    UPDATE_ITEM_BATCH: (state, payload: { id: string; updates: Partial<any> }) => {
      // Same as UPDATE_ITEM but doesn't trigger history in batch mode
      const { id, updates } = payload;
      
      const savedIndex = state.savedItems.findIndex((item: any) => item.id === id);
      if (savedIndex !== -1) {
        state.savedItems[savedIndex] = { ...state.savedItems[savedIndex], ...updates };
        return;
      }
      
      const newIndex = state.newItems.findIndex((item: any) => item.id === id);
      if (newIndex !== -1) {
        state.newItems[newIndex] = { ...state.newItems[newIndex], ...updates };
      }
    },
    FINISH_BATCH_OPERATION: (state) => {
      state.isBatchOperation = false;
      // Add single history entry for the entire batch
      if (state.addToHistory) {
        state.addToHistory();
      }
    }
  },
  methodExtensions: {
    isBatch: (state) => state.isBatchOperation
  }
};

// =============================================================================
// BEHAVIOR 7: PAGE OPERATIONS
// =============================================================================

export const pageOperationsBehavior: Behavior = {
  name: 'pageOperations',
  stateExtensions: {
    // No additional state needed - operates on existing items
  },
  actionHandlers: {
    SET_ITEM_PAGE: (state, payload: { id: string; page: number | null }) => {
      const { id, page } = payload;
      
      const savedIndex = state.savedItems.findIndex((item: any) => item.id === id);
      if (savedIndex !== -1) {
        state.savedItems[savedIndex] = { ...state.savedItems[savedIndex], page };
        return;
      }
      
      const newIndex = state.newItems.findIndex((item: any) => item.id === id);
      if (newIndex !== -1) {
        state.newItems[newIndex] = { ...state.newItems[newIndex], page };
      }
    },
    TOGGLE_ITEM_GLOBAL: (state, payload: string) => {
      const id = payload;
      
      // Find the item and toggle between global (null) and current page
      const allItems = [...state.savedItems, ...state.newItems];
      const item = allItems.find((item: any) => item.id === id);
      
      if (item) {
        const newPage = item.page === null ? state.currentPage || 1 : null;
        state.dispatch({ type: 'SET_ITEM_PAGE', payload: { id, page: newPage } });
      }
    },
    CLEAR_PAGE: (state, payload: number) => {
      const pageNumber = payload;
      
      // Remove all items on this page
      state.savedItems = state.savedItems.filter((item: any) => item.page !== pageNumber);
      state.newItems = state.newItems.filter((item: any) => item.page !== pageNumber);
      
      // Clear selection if selected item was on this page
      if (state.selectedItemId) {
        const selectedItem = state.getSelectedItem();
        if (selectedItem && selectedItem.page === pageNumber) {
          state.selectedItemId = null;
        }
      }
    }
  },
  methodExtensions: {
    getItemsForPage: (state, page: number | null) => {
      const allItems = [...state.savedItems, ...state.newItems];
      return allItems.filter((item: any) => item.page === page);
    },
    getGlobalItems: (state) => state.getItemsForPage(null),
    getPageItems: (state, page: number) => state.getItemsForPage(page)
  }
};

// =============================================================================
// BEHAVIOR 8: BULK OPERATIONS
// =============================================================================

export const bulkOperationsBehavior: Behavior = {
  name: 'bulkOperations',
  stateExtensions: {
    isClearing: false
  },
  actionHandlers: {
    SET_CLEARING: (state, payload: boolean) => {
      state.isClearing = payload;
    },
    CLEAR_ALL: (state) => {
      state.savedItems = [];
      state.newItems = [];
      state.selectedItemId = null;
      state.isClearing = false;
    }
  },
  methodExtensions: {
    clearAll: (state) => {
      state.dispatch({ type: 'SET_CLEARING', payload: true });
      // Clear happens immediately
      state.dispatch({ type: 'CLEAR_ALL' });
    }
  }
};

// =============================================================================
// BEHAVIOR REGISTRY
// =============================================================================

export const BEHAVIORS = {
  crud: crudBehavior,
  changeTracking: changeTrackingBehavior,
  history: historyBehavior,
  drawing: drawingBehavior,
  selection: selectionBehavior,
  batchOperations: batchOperationsBehavior,
  pageOperations: pageOperationsBehavior,
  bulkOperations: bulkOperationsBehavior
} as const;
