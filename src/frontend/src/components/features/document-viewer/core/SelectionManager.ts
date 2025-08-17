/**
 * Simplified Selection Manager
 * 
 * This replaces the complex state management with a simpler, more predictable approach:
 * - Single source of truth for selections
 * - Clear separation of concerns
 * - Simplified history management
 * - No UI state mixed with business logic
 */

import { type Selection } from '../types/viewer';

export interface PendingChanges {
  creates: Selection[]; // New selections to be created
  updates: Selection[]; // Modified saved selections to be updated 
  deletes: Selection[]; // Saved selections that have been deleted
}

export interface SelectionManagerState {
  // Core selection data
  savedSelections: Selection[];
  newSelections: Selection[];
  
  // UI state (separate from business logic)
  selectedSelectionId: string | null; // ID-based reference instead of type+index
  
  // Drawing state
  currentDraw: Selection | null;
  isDrawing: boolean;
  
  // History - tracks changes from initial state
  initialState: SelectionSnapshot; // The starting point (loaded selections or empty)
  changeHistory: SelectionSnapshot[]; // Array of changes from initial state
  currentHistoryIndex: number; // -1 = at initial state, 0+ = at specific change
}

interface SelectionSnapshot {
  savedSelections: Selection[];
  newSelections: Selection[];
  timestamp: number;
}

export type SelectionManagerAction =
  | { type: 'START_DRAW'; payload: Selection }
  | { type: 'UPDATE_DRAW'; payload: Selection }
  | { type: 'FINISH_DRAW' }
  | { type: 'CANCEL_DRAW' }
  | { type: 'SELECT_SELECTION'; payload: string | null }
  | { type: 'UPDATE_SELECTION'; payload: { id: string; selection: Selection } }
  | { type: 'UPDATE_SELECTION_BATCH'; payload: { id: string; selection: Selection } }
  | { type: 'FINISH_BATCH_OPERATION' }
  | { type: 'DELETE_SELECTION'; payload: string }
  | { type: 'TOGGLE_SELECTION_GLOBAL'; payload: { id: string; currentPageNumber?: number | null } }
  | { type: 'SET_SELECTION_PAGE'; payload: { id: string; pageNumber: number | null } }
  | { type: 'LOAD_SAVED_SELECTIONS'; payload: Selection[] }
  | { type: 'COMMIT_CHANGES' } // Resets initial state to current state after successful save
  | { type: 'DISCARD_ALL_CHANGES' } // Resets current state to initial state (discards all changes)
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEAR_PAGE'; payload: number };

class SelectionManager {
  private state: SelectionManagerState;
  private listeners: Set<(state: SelectionManagerState) => void> = new Set();
  private isBatchOperation: boolean = false;

  constructor(initialState?: Partial<SelectionManagerState>) {
    this.state = {
      savedSelections: [],
      newSelections: [],
      selectedSelectionId: null,
      currentDraw: null,
      isDrawing: false,
      initialState: {
        savedSelections: [],
        newSelections: [],
        timestamp: Date.now(),
      },
      changeHistory: [],
      currentHistoryIndex: -1, // -1 means we're at initial state
      ...initialState,
    };
  }

  // State access
  getState(): SelectionManagerState {
    return {
      ...this.state,
      savedSelections: [...this.state.savedSelections],
      newSelections: [...this.state.newSelections],
      initialState: {
        ...this.state.initialState,
        savedSelections: [...this.state.initialState.savedSelections],
        newSelections: [...this.state.initialState.newSelections]
      },
      changeHistory: [...this.state.changeHistory]
    };
  }

  // Subscription management
  subscribe(listener: (state: SelectionManagerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // History management - tracks changes from initial state
  private addToHistory() {
    // Don't add to history during batch operations
    if (this.isBatchOperation) {
      return;
    }
    
    const snapshot: SelectionSnapshot = {
      savedSelections: [...this.state.savedSelections],
      newSelections: [...this.state.newSelections],
      timestamp: Date.now(),
    };

    // If we're in the middle of history and make a new change,
    // truncate future history and add the new change
    if (this.state.currentHistoryIndex < this.state.changeHistory.length - 1) {
      this.state.changeHistory = this.state.changeHistory.slice(0, this.state.currentHistoryIndex + 1);
    }
    
    // Add the new change to history
    this.state.changeHistory.push(snapshot);
    this.state.currentHistoryIndex = this.state.changeHistory.length - 1;

    // Keep only last 50 changes
    if (this.state.changeHistory.length > 50) {
      this.state.changeHistory.shift();
      this.state.currentHistoryIndex = Math.max(0, this.state.currentHistoryIndex - 1);
    }
  }

  // Core actions
  dispatch(action: SelectionManagerAction) {
    switch (action.type) {
      case 'START_DRAW':
        this.state.currentDraw = action.payload;
        this.state.isDrawing = true;
        this.state.selectedSelectionId = null; // Clear selection when drawing
        break;

      case 'UPDATE_DRAW':
        if (this.state.isDrawing) {
          this.state.currentDraw = action.payload;
        }
        break;

      case 'FINISH_DRAW':
        if (this.state.currentDraw && this.state.isDrawing) {
          // Add to new selections
          const newSelection = {
            ...this.state.currentDraw,
            id: this.generateId(),
          };
          this.state.newSelections.push(newSelection);
          this.addToHistory();
        }
        this.state.currentDraw = null;
        this.state.isDrawing = false;
        break;

      case 'CANCEL_DRAW':
        this.state.currentDraw = null;
        this.state.isDrawing = false;
        break;

      case 'SELECT_SELECTION':
        this.state.selectedSelectionId = action.payload;
        break;

      case 'UPDATE_SELECTION':
        const { id: updateId, selection: updatedSelection } = action.payload;
        let selectionUpdated = false;
        
        // Update in saved selections
        const savedUpdateIndex = this.state.savedSelections.findIndex(s => s.id === updateId);
        if (savedUpdateIndex >= 0) {
          this.state.savedSelections[savedUpdateIndex] = updatedSelection;
          selectionUpdated = true;
        }
        
        // Update in new selections
        const newUpdateIndex = this.state.newSelections.findIndex(s => s.id === updateId);
        if (newUpdateIndex >= 0) {
          this.state.newSelections[newUpdateIndex] = updatedSelection;
          selectionUpdated = true;
        }
        
        // Only add to history once if any update was made
        if (selectionUpdated) {
          this.addToHistory();
        }
        break;

      case 'UPDATE_SELECTION_BATCH':
        const { id: batchUpdateId, selection: batchUpdatedSelection } = action.payload;
        
        // Start batch operation if not already started
        if (!this.isBatchOperation) {
          this.isBatchOperation = true;
        }
        
        // Update in saved selections
        const batchSavedUpdateIndex = this.state.savedSelections.findIndex(s => s.id === batchUpdateId);
        if (batchSavedUpdateIndex >= 0) {
          this.state.savedSelections[batchSavedUpdateIndex] = batchUpdatedSelection;
        }
        
        // Update in new selections
        const batchNewUpdateIndex = this.state.newSelections.findIndex(s => s.id === batchUpdateId);
        if (batchNewUpdateIndex >= 0) {
          this.state.newSelections[batchNewUpdateIndex] = batchUpdatedSelection;
        }
        break;

      case 'FINISH_BATCH_OPERATION':
        if (this.isBatchOperation) {
          this.isBatchOperation = false;
          this.addToHistory(); // Add single history entry for the entire batch operation
        }
        break;

      case 'DELETE_SELECTION':
        const selectionId = action.payload;
        let selectionDeleted = false;
        
        // Remove from saved selections using immutable approach
        const savedIndex = this.state.savedSelections.findIndex(s => s.id === selectionId);
        if (savedIndex >= 0) {
          this.state.savedSelections = this.state.savedSelections.filter(s => s.id !== selectionId);
          selectionDeleted = true;
        }
        
        // Remove from new selections using immutable approach
        const newIndex = this.state.newSelections.findIndex(s => s.id === selectionId);
        if (newIndex >= 0) {
          this.state.newSelections = this.state.newSelections.filter(s => s.id !== selectionId);
          selectionDeleted = true;
        }
        
        // Clear selection if deleted
        if (this.state.selectedSelectionId === selectionId) {
          this.state.selectedSelectionId = null;
        }
        
        // Only add to history once if any deletion was made
        if (selectionDeleted) {
          this.addToHistory();
        }
        break;

      case 'TOGGLE_SELECTION_GLOBAL':
        const { id: toggleId, currentPageNumber } = action.payload;
        let toggleUpdated = false;
        
        // Update in saved selections
        const toggleSavedIndex = this.state.savedSelections.findIndex(s => s.id === toggleId);
        if (toggleSavedIndex >= 0) {
          const selection = this.state.savedSelections[toggleSavedIndex];
          // Toggle: if currently global (null), set to current page; if on a page, make global
          const newPageNumber = selection.page_number === null ? currentPageNumber : null;
          this.state.savedSelections[toggleSavedIndex] = {
            ...selection,
            page_number: newPageNumber
          };
          toggleUpdated = true;
        }
        
        // Update in new selections
        const toggleNewIndex = this.state.newSelections.findIndex(s => s.id === toggleId);
        if (toggleNewIndex >= 0) {
          const selection = this.state.newSelections[toggleNewIndex];
          // Toggle: if currently global (null), set to current page; if on a page, make global
          const newPageNumber = selection.page_number === null ? currentPageNumber : null;
          this.state.newSelections[toggleNewIndex] = {
            ...selection,
            page_number: newPageNumber
          };
          toggleUpdated = true;
        }
        
        // Only add to history if any update was made
        if (toggleUpdated) {
          this.addToHistory();
        }
        break;

      case 'SET_SELECTION_PAGE':
        const { id: setPageId, pageNumber: setPageNumber } = action.payload;
        let setPageUpdated = false;
        
        // Update in saved selections
        const setPageSavedIndex = this.state.savedSelections.findIndex(s => s.id === setPageId);
        if (setPageSavedIndex >= 0) {
          this.state.savedSelections[setPageSavedIndex] = {
            ...this.state.savedSelections[setPageSavedIndex],
            page_number: setPageNumber
          };
          setPageUpdated = true;
        }
        
        // Update in new selections
        const setPageNewIndex = this.state.newSelections.findIndex(s => s.id === setPageId);
        if (setPageNewIndex >= 0) {
          this.state.newSelections[setPageNewIndex] = {
            ...this.state.newSelections[setPageNewIndex],
            page_number: setPageNumber
          };
          setPageUpdated = true;
        }
        
        // Only add to history if any update was made
        if (setPageUpdated) {
          this.addToHistory();
        }
        break;

      case 'LOAD_SAVED_SELECTIONS':
        // Set the loaded selections as both current state AND initial state
        this.state.savedSelections = action.payload;
        this.state.selectedSelectionId = null;
        
        // Clear new selections since they should now be part of saved selections
        this.state.newSelections = [];
        
        // Update the initial state to reflect loaded selections
        this.state.initialState = {
          savedSelections: [...action.payload],
          newSelections: [],
          timestamp: Date.now(),
        };
        
        // Reset history - we're now at a new initial state
        this.state.changeHistory = [];
        this.state.currentHistoryIndex = -1; // At initial state
        break;

      case 'COMMIT_CHANGES':
        // Update initial state to current state after successful save
        // This makes all pending changes "committed" and no longer unsaved
        this.state.initialState = {
          savedSelections: [...this.state.savedSelections],
          newSelections: [], // New selections should be empty after commit
          timestamp: Date.now(),
        };
        
        // Clear new selections since they should now be part of saved selections
        this.state.newSelections = [];
        
        // Don't reset history - users should still be able to undo/redo
        // but now the "clean" state is the post-save state
        break;

      case 'DISCARD_ALL_CHANGES':
        // Reset current state to initial state (discard all changes)
        this.state.savedSelections = [...this.state.initialState.savedSelections];
        this.state.newSelections = [...this.state.initialState.newSelections];
        this.state.selectedSelectionId = null;
        
        // Reset history - we're back at initial state
        this.state.changeHistory = [];
        this.state.currentHistoryIndex = -1;
        break;

      case 'UNDO':
        if (this.canUndo()) {
          if (this.state.currentHistoryIndex === 0) {
            // Go back to initial state
            this.state.savedSelections = [...this.state.initialState.savedSelections];
            this.state.newSelections = [...this.state.initialState.newSelections];
            this.state.currentHistoryIndex = -1;
          } else {
            // Go back one change in history
            this.state.currentHistoryIndex--;
            const snapshot = this.state.changeHistory[this.state.currentHistoryIndex];
            
            // Validate snapshot before applying
            if (!snapshot || !Array.isArray(snapshot.savedSelections) || !Array.isArray(snapshot.newSelections)) {
              console.error('Invalid history snapshot during undo:', snapshot);
              this.state.currentHistoryIndex++; // Revert the index change
              return;
            }
            
            this.state.savedSelections = [...snapshot.savedSelections];
            this.state.newSelections = [...snapshot.newSelections];
          }
          this.state.selectedSelectionId = null; // Clear selection after undo
        } else {
          // At initial state, do nothing
          return; // Early return to prevent notification when no change occurred
        }
        break;

      case 'REDO':
        if (this.canRedo()) {
          this.state.currentHistoryIndex++;
          const snapshot = this.state.changeHistory[this.state.currentHistoryIndex];
          
          // Validate snapshot before applying
          if (!snapshot || !Array.isArray(snapshot.savedSelections) || !Array.isArray(snapshot.newSelections)) {
            console.error('Invalid history snapshot during redo:', snapshot);
            this.state.currentHistoryIndex--; // Revert the index change
            return;
          }
          
          this.state.savedSelections = [...snapshot.savedSelections];
          this.state.newSelections = [...snapshot.newSelections];
          this.state.selectedSelectionId = null; // Clear selection after redo
        } else {
          return; // Early return to prevent notification when no change occurred
        }
        break;

      case 'CLEAR_ALL':
        this.state.savedSelections = [];
        this.state.newSelections = [];
        this.state.selectedSelectionId = null;
        this.addToHistory();
        break;

      case 'CLEAR_PAGE':
        const pageNumber = action.payload;
        let anySelectionCleared = false;
        
        // Remove selections from saved selections that match the page
        const originalSavedLength = this.state.savedSelections.length;
        this.state.savedSelections = this.state.savedSelections.filter(s => s.page_number !== pageNumber);
        if (this.state.savedSelections.length !== originalSavedLength) {
          anySelectionCleared = true;
        }
        
        // Remove selections from new selections that match the page
        const originalNewLength = this.state.newSelections.length;
        this.state.newSelections = this.state.newSelections.filter(s => s.page_number !== pageNumber);
        if (this.state.newSelections.length !== originalNewLength) {
          anySelectionCleared = true;
        }
        
        // Clear selected selection if it was on the cleared page
        if (this.state.selectedSelectionId) {
          const selectedSelection = this.getAllSelections().find(s => s.id === this.state.selectedSelectionId);
          if (selectedSelection && selectedSelection.page_number === pageNumber) {
            this.state.selectedSelectionId = null;
          }
        }
        
        // Only add to history if any selections were actually cleared
        if (anySelectionCleared) {
          this.addToHistory();
        }
        break;

      default:
        return; // No state change
    }

    this.notify();
  }

  // Utility methods
  private generateId(): string {
    return `sel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Computed getters
  getAllSelections(): Selection[] {
    return [...this.state.savedSelections, ...this.state.newSelections];
  }

  getSelectedSelection(): Selection | null {
    if (!this.state.selectedSelectionId) return null;
    
    return this.getAllSelections().find(s => s.id === this.state.selectedSelectionId) || null;
  }

  canUndo(): boolean {
    // Can undo if we have changes in history (currentHistoryIndex >= 0)
    return this.state.currentHistoryIndex >= 0;
  }

  canRedo(): boolean {
    // Can redo if we're not at the latest change
    return this.state.currentHistoryIndex < this.state.changeHistory.length - 1;
  }

  hasUnsavedChanges(): boolean {
    const changes = this.getPendingChanges();
    return changes.creates.length > 0 || changes.updates.length > 0 || changes.deletes.length > 0;
  }

  getPendingChanges(): PendingChanges {
    const creates = [...this.state.newSelections];
    
    // Find updates: saved selections that differ from their initial state
    const updates = this.state.savedSelections.filter(currentSelection => {
      const initialSelection = this.state.initialState.savedSelections.find(
        initial => initial.id === currentSelection.id
      );
      
      if (!initialSelection) {
        // This selection wasn't in the initial state - it's a new selection that was already saved
        return false;
      }
      
      // Check if any properties have changed from the initial state
      return (
        currentSelection.x !== initialSelection.x ||
        currentSelection.y !== initialSelection.y ||
        currentSelection.width !== initialSelection.width ||
        currentSelection.height !== initialSelection.height ||
        currentSelection.page_number !== initialSelection.page_number
      );
    });
    
    // Find deletes: selections that exist in initial state but not in current saved selections
    const deletes = this.state.initialState.savedSelections.filter(initialSelection => {
      return !this.state.savedSelections.find(current => current.id === initialSelection.id);
    });
    
    return { creates, updates, deletes };
  }

  getPendingChangesCount(): number {
    const changes = this.getPendingChanges();
    return changes.creates.length + changes.updates.length + changes.deletes.length;
  }
}

export default SelectionManager;
