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

export interface SelectionManagerState {
  // Core selection data
  savedSelections: Selection[];
  newSelections: Selection[];
  
  // UI state (separate from business logic)
  selectedSelectionId: string | null; // ID-based reference instead of type+index
  
  // Drawing state
  currentDraw: Selection | null;
  isDrawing: boolean;
  
  // History (simplified - only track meaningful changes)
  history: SelectionSnapshot[];
  historyIndex: number;
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
  | { type: 'SAVE_NEW_SELECTIONS'; payload: Selection[] }
  | { type: 'LOAD_SAVED_SELECTIONS'; payload: Selection[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_ALL' };

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
      history: [],
      historyIndex: -1,
      ...initialState,
    };
    
    // Add initial state to history
    this.addInitialHistory();
  }
  
  // Add initial state to history
  private addInitialHistory() {
    const initialSnapshot: SelectionSnapshot = {
      savedSelections: [...this.state.savedSelections],
      newSelections: [...this.state.newSelections],
      timestamp: Date.now(),
    };
    
    this.state.history = [initialSnapshot];
    this.state.historyIndex = 0;
  }

  // State access
  getState(): SelectionManagerState {
    return { ...this.state };
  }

  // Subscription management
  subscribe(listener: (state: SelectionManagerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // History management (simplified)
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

    // Truncate future history if we're not at the end
    const newHistory = this.state.history.slice(0, this.state.historyIndex + 1);
    newHistory.push(snapshot);

    // Keep only last 50 snapshots
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    this.state.history = newHistory;
    this.state.historyIndex = newHistory.length - 1;
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
        
        // Remove from saved selections
        const savedIndex = this.state.savedSelections.findIndex(s => s.id === selectionId);
        if (savedIndex >= 0) {
          this.state.savedSelections.splice(savedIndex, 1);
          selectionDeleted = true;
        }
        
        // Remove from new selections
        const newIndex = this.state.newSelections.findIndex(s => s.id === selectionId);
        if (newIndex >= 0) {
          this.state.newSelections.splice(newIndex, 1);
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

      case 'SAVE_NEW_SELECTIONS':
        // Move new selections to saved
        const newSaved = action.payload.map(sel => ({
          ...sel,
          id: sel.id || this.generateId(),
        }));
        this.state.savedSelections.push(...newSaved);
        this.state.newSelections = [];
        this.addToHistory();
        break;

      case 'LOAD_SAVED_SELECTIONS':
        this.state.savedSelections = action.payload;
        this.state.selectedSelectionId = null;
        
        // If we're at the initial state (historyIndex 0) and history has only the initial empty snapshot,
        // update the initial snapshot instead of creating a new one
        if (this.state.historyIndex === 0 && this.state.history.length === 1) {
          const initialSnapshot = this.state.history[0];
          if (initialSnapshot.savedSelections.length === 0 && initialSnapshot.newSelections.length === 0) {
            // Update the initial snapshot with the loaded selections
            this.state.history[0] = {
              savedSelections: [...this.state.savedSelections],
              newSelections: [...this.state.newSelections],
              timestamp: Date.now(),
            };
            console.log('Updated initial history snapshot with loaded selections:', this.state.history[0]);
          } else {
            this.addToHistory();
          }
        } else {
          this.addToHistory();
        }
        break;

      case 'UNDO':
        if (this.canUndo()) {
          this.state.historyIndex--;
          const snapshot = this.state.history[this.state.historyIndex];
          
          // Validate snapshot before applying
          if (!snapshot || !Array.isArray(snapshot.savedSelections) || !Array.isArray(snapshot.newSelections)) {
            console.error('Invalid history snapshot during undo:', snapshot);
            this.state.historyIndex++; // Revert the index change
            return;
          }
          
          this.state.savedSelections = [...snapshot.savedSelections];
          this.state.newSelections = [...snapshot.newSelections];
          this.state.selectedSelectionId = null; // Clear selection after undo
        } else {
          // At initial state, do nothing
          return; // Early return to prevent notification when no change occurred
        }
        break;

      case 'REDO':
        if (this.canRedo()) {
          this.state.historyIndex++;
          const snapshot = this.state.history[this.state.historyIndex];
          
          // Validate snapshot before applying
          if (!snapshot || !Array.isArray(snapshot.savedSelections) || !Array.isArray(snapshot.newSelections)) {
            console.error('Invalid history snapshot during redo:', snapshot);
            this.state.historyIndex--; // Revert the index change
            return;
          }
          
          this.state.savedSelections = [...snapshot.savedSelections];
          this.state.newSelections = [...snapshot.newSelections];
          this.state.selectedSelectionId = null; // Clear selection after redo
        } else {
          // At latest state, do nothing
          return; // Early return to prevent notification when no change occurred
        }
        break;

      case 'CLEAR_ALL':
        this.state.savedSelections = [];
        this.state.newSelections = [];
        this.state.selectedSelectionId = null;
        this.addToHistory();
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
    return this.state.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  hasUnsavedChanges(): boolean {
    return this.state.newSelections.length > 0;
  }
}

export default SelectionManager;
