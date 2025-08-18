/**
 * Simplified Selection Manager using BaseManager abstraction - Part 1
 * 
 * Focuses on selection-specific logic while inheriting common patterns from BaseManager
 */

import { type Selection } from '../types/viewer';
import type { SelectionType } from '@/types';
import type { Result } from '@/lib/result';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import { 
  BaseManager, 
  type BaseManagerState, 
  type BaseManagerAction,
  type ItemComparator,
  type ApiAdapter,
  type PendingChanges as BasePendingChanges
} from './BaseManager';

// Selection-specific types extending base types
export interface SelectionManagerState extends BaseManagerState<Selection> {
  // Selection-specific UI state
  selectedSelectionId: string | null;
  
  // Drawing state
  currentDraw: Selection | null;
  isDrawing: boolean;
  
  // History for undo/redo (selection-specific feature)
  changeHistory: SelectionSnapshot[];
  currentHistoryIndex: number;
}

interface SelectionSnapshot {
  savedSelections: Selection[];
  newSelections: Selection[];
  timestamp: number;
}

export type SelectionManagerAction = 
  | BaseManagerAction<Selection>
  | { type: 'START_DRAW'; payload: Selection }
  | { type: 'UPDATE_DRAW'; payload: Selection }
  | { type: 'FINISH_DRAW' }
  | { type: 'CANCEL_DRAW' }
  | { type: 'SELECT_SELECTION'; payload: string | null }
  | { type: 'UPDATE_SELECTION_BATCH'; payload: { id: string; selection: Selection } }
  | { type: 'FINISH_BATCH_OPERATION' }
  | { type: 'TOGGLE_SELECTION_GLOBAL'; payload: { id: string; currentPageNumber?: number | null } }
  | { type: 'SET_SELECTION_PAGE'; payload: { id: string; pageNumber: number | null } }
  | { type: 'CLEAR_PAGE'; payload: number }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export type PendingChanges = BasePendingChanges<Selection>;

// Selection-specific implementations
const selectionComparator: ItemComparator<Selection> = {
  getId: (selection: Selection) => selection.id,
  areEqual: (a: Selection, b: Selection) => (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.page_number === b.page_number
  )
};

const selectionApiAdapter: ApiAdapter<Selection, Omit<SelectionType, 'id' | 'created_at' | 'updated_at'>> = {
  fetch: async (documentId: string) => {
    const result = await DocumentViewerAPI.fetchDocumentSelections(documentId);
    if (result.ok) {
      // Convert SelectionType[] to Selection[] for internal use
      const selections: Selection[] = result.value.map(sel => ({
        id: sel.id,
        x: sel.x,
        y: sel.y,
        width: sel.width,
        height: sel.height,
        page_number: sel.page_number,
        confidence: sel.confidence || undefined,
        document_id: sel.document_id,
      }));
      return { ok: true, value: selections };
    }
    return result as any;
  },
  create: (documentId: string, data) => DocumentViewerAPI.createSelection(documentId, data),
  update: (id: string, data) => DocumentViewerAPI.updateSelection(id, data),
  delete: (id: string) => DocumentViewerAPI.deleteSelection(id),
  transformForCreate: (selection: Selection) => ({
    page_number: selection.page_number ?? null,
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    confidence: selection.confidence || null,
    document_id: selection.document_id,
    is_ai_generated: false, // Default value for new selections
  }),
  transformForUpdate: (selection: Selection) => ({
    page_number: selection.page_number ?? null,
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    confidence: selection.confidence || null,
  })
};

class SelectionManager extends BaseManager<Selection, Omit<SelectionType, 'id' | 'created_at' | 'updated_at'>> {
  private isBatchOperation: boolean = false;

  constructor(documentId: string, initialState?: Partial<SelectionManagerState>) {
    super(documentId, selectionComparator, selectionApiAdapter, {
      // Selection-specific defaults
      selectedSelectionId: null,
      currentDraw: null,
      isDrawing: false,
      changeHistory: [],
      currentHistoryIndex: -1,
      ...initialState,
    });
  }

  // Override getState to return selection-specific state
  getState(): SelectionManagerState {
    const baseState = super.getState();
    return {
      ...baseState,
      // Add selection-specific states
      selectedSelectionId: (this.state as SelectionManagerState).selectedSelectionId,
      currentDraw: (this.state as SelectionManagerState).currentDraw,
      isDrawing: (this.state as SelectionManagerState).isDrawing,
      changeHistory: [...(this.state as SelectionManagerState).changeHistory],
      currentHistoryIndex: (this.state as SelectionManagerState).currentHistoryIndex,
      // Map base names to domain-specific names for backward compatibility
      savedSelections: baseState.savedItems,
      newSelections: baseState.newItems,
    } as SelectionManagerState;
  }

  // Domain-specific utility methods
  private generateId(): string {
    return `sel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // History management for undo/redo
  private addToHistory() {
    if (this.isBatchOperation) {
      return;
    }
    
    const snapshot: SelectionSnapshot = {
      savedSelections: [...this.state.savedItems],
      newSelections: [...this.state.newItems],
      timestamp: Date.now(),
    };

    const state = this.state as SelectionManagerState;
    
    // If we're in the middle of history and make a new change, truncate future history
    if (state.currentHistoryIndex < state.changeHistory.length - 1) {
      state.changeHistory = state.changeHistory.slice(0, state.currentHistoryIndex + 1);
    }
    
    // Add the new change to history
    state.changeHistory.push(snapshot);
    state.currentHistoryIndex = state.changeHistory.length - 1;

    // Keep only last 50 changes
    if (state.changeHistory.length > 50) {
      state.changeHistory.shift();
      state.currentHistoryIndex = Math.max(0, state.currentHistoryIndex - 1);
    }
  }

  // Domain-specific convenience methods (maintain existing API)
  getAllSelections(): Selection[] {
    return this.getAllItems();
  }

  getSelectedSelection(): Selection | null {
    const state = this.state as SelectionManagerState;
    if (!state.selectedSelectionId) return null;
    return this.getAllItems().find(s => s.id === state.selectedSelectionId) || null;
  }

  canUndo(): boolean {
    const state = this.state as SelectionManagerState;
    return state.currentHistoryIndex >= 0;
  }

  canRedo(): boolean {
    const state = this.state as SelectionManagerState;
    return state.currentHistoryIndex < state.changeHistory.length - 1;
  }

  getPendingChanges(): PendingChanges {
    return super.getPendingChanges();
  }

  // Handle selection-specific actions
  protected processCustomAction(action: SelectionManagerAction): boolean {
    const state = this.state as SelectionManagerState;
    
    switch (action.type) {
      case 'START_DRAW':
        state.currentDraw = action.payload;
        state.isDrawing = true;
        state.selectedSelectionId = null; // Clear selection when drawing
        return true;

      case 'UPDATE_DRAW':
        if (state.isDrawing) {
          state.currentDraw = action.payload;
        }
        return true;

      case 'FINISH_DRAW':
        if (state.currentDraw && state.isDrawing) {
          // Add to new selections
          const newSelection = {
            ...state.currentDraw,
            id: this.generateId(),
          };
          this.state.newItems.push(newSelection);
          this.addToHistory();
        }
        state.currentDraw = null;
        state.isDrawing = false;
        return true;

      case 'CANCEL_DRAW':
        state.currentDraw = null;
        state.isDrawing = false;
        return true;

      case 'SELECT_SELECTION':
        state.selectedSelectionId = action.payload;
        return true;

      case 'UPDATE_SELECTION_BATCH':
        const { id: batchUpdateId, selection: batchUpdatedSelection } = action.payload;
        
        // Start batch operation if not already started
        if (!this.isBatchOperation) {
          this.isBatchOperation = true;
        }
        
        // Update using base class method
        this.processBaseAction({ type: 'UPDATE_ITEM', payload: { id: batchUpdateId, item: batchUpdatedSelection } });
        return false; // Don't notify yet, wait for FINISH_BATCH_OPERATION

      case 'FINISH_BATCH_OPERATION':
        if (this.isBatchOperation) {
          this.isBatchOperation = false;
          this.addToHistory(); // Add single history entry for the entire batch operation
        }
        return true;

      case 'TOGGLE_SELECTION_GLOBAL':
        const { id: toggleId, currentPageNumber } = action.payload;
        const toggleSelection = this.getItemById(toggleId);
        if (toggleSelection) {
          const newPageNumber = toggleSelection.page_number === null ? currentPageNumber : null;
          this.processBaseAction({ 
            type: 'UPDATE_ITEM', 
            payload: { 
              id: toggleId, 
              item: { ...toggleSelection, page_number: newPageNumber } 
            } 
          });
          this.addToHistory();
        }
        return false; // Base action already handled notification

      case 'SET_SELECTION_PAGE':
        const { id: setPageId, pageNumber: setPageNumber } = action.payload;
        const setPageSelection = this.getItemById(setPageId);
        if (setPageSelection) {
          this.processBaseAction({ 
            type: 'UPDATE_ITEM', 
            payload: { 
              id: setPageId, 
              item: { ...setPageSelection, page_number: setPageNumber } 
            } 
          });
          this.addToHistory();
        }
        return false; // Base action already handled notification

      case 'CLEAR_PAGE':
        const pageNumber = action.payload;
        let anySelectionCleared = false;
        
        // Remove selections that match the page
        const originalSavedLength = this.state.savedItems.length;
        this.state.savedItems = this.state.savedItems.filter(s => s.page_number !== pageNumber);
        if (this.state.savedItems.length !== originalSavedLength) {
          anySelectionCleared = true;
        }
        
        const originalNewLength = this.state.newItems.length;
        this.state.newItems = this.state.newItems.filter(s => s.page_number !== pageNumber);
        if (this.state.newItems.length !== originalNewLength) {
          anySelectionCleared = true;
        }
        
        // Clear selected selection if it was on the cleared page
        if (state.selectedSelectionId) {
          const selectedSelection = this.getAllItems().find(s => s.id === state.selectedSelectionId);
          if (selectedSelection && selectedSelection.page_number === pageNumber) {
            state.selectedSelectionId = null;
          }
        }
        
        // Only add to history if any selections were actually cleared
        if (anySelectionCleared) {
          this.addToHistory();
        }
        return true;

      case 'UNDO':
        if (this.canUndo()) {
          if (state.currentHistoryIndex === 0) {
            // Go back to initial state
            this.state.savedItems = [...this.state.initialState.savedItems];
            this.state.newItems = [...this.state.initialState.newItems];
            state.currentHistoryIndex = -1;
          } else {
            // Go back one change in history
            state.currentHistoryIndex--;
            const snapshot = state.changeHistory[state.currentHistoryIndex];
            
            if (snapshot && Array.isArray(snapshot.savedSelections) && Array.isArray(snapshot.newSelections)) {
              this.state.savedItems = [...snapshot.savedSelections];
              this.state.newItems = [...snapshot.newSelections];
            } else {
              console.error('Invalid history snapshot during undo:', snapshot);
              state.currentHistoryIndex++; // Revert the index change
              return false;
            }
          }
          state.selectedSelectionId = null; // Clear selection after undo
        }
        return true;

      case 'REDO':
        if (this.canRedo()) {
          state.currentHistoryIndex++;
          const snapshot = state.changeHistory[state.currentHistoryIndex];
          
          if (snapshot && Array.isArray(snapshot.savedSelections) && Array.isArray(snapshot.newSelections)) {
            this.state.savedItems = [...snapshot.savedSelections];
            this.state.newItems = [...snapshot.newSelections];
          } else {
            console.error('Invalid history snapshot during redo:', snapshot);
            state.currentHistoryIndex--; // Revert the index change
            return false;
          }
          state.selectedSelectionId = null; // Clear selection after redo
        }
        return true;

      default:
        return false; // Action not handled
    }
  }

  // Override base methods that need history tracking
  updateItem(id: string, updates: Partial<Selection>): boolean {
    const success = super.updateItem(id, updates);
    if (success) {
      this.addToHistory();
    }
    return success;
  }

  deleteItemLocally(id: string): boolean {
    const success = super.deleteItemLocally(id);
    if (success) {
      // Clear selection if deleted
      const state = this.state as SelectionManagerState;
      if (state.selectedSelectionId === id) {
        state.selectedSelectionId = null;
      }
      this.addToHistory();
    }
    return success;
  }

  clearAll(): void {
    super.clearAll();
    const state = this.state as SelectionManagerState;
    state.selectedSelectionId = null;
    this.addToHistory();
  }

  // API methods - maintain existing interface
  async loadSelections(): Promise<Result<SelectionType[], unknown>> {
    const result = await this.loadItems();
    // Transform back to SelectionType[] for compatibility
    if (result.ok) {
      const selectionTypes: SelectionType[] = result.value.map(sel => ({
        id: sel.id,
        x: sel.x,
        y: sel.y,
        width: sel.width,
        height: sel.height,
        page_number: sel.page_number ?? null,
        confidence: sel.confidence || null,
        document_id: sel.document_id,
        is_ai_generated: false, // Default for existing selections
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      return { ok: true, value: selectionTypes };
    }
    return result as any;
  }
}

export default SelectionManager;
