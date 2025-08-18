/**
 * Base Manager Abstraction
 * 
 * Provides common functionality for document viewer managers:
 * - State management with saved/new items split
 * - Subscription pattern for React integration  
 * - Pending changes tracking
 * - Common loading and error states
 * - Generic API integration patterns
 */

import type { Result } from '@/lib/result';

export interface PendingChanges<T> {
  creates: T[]; // New items to be created
  updates: T[]; // Modified saved items to be updated
  deletes: T[]; // Saved items that have been deleted
}

export interface BaseSnapshot<T> {
  savedItems: T[];
  newItems: T[];
  timestamp: number;
}

export interface BaseManagerState<T> {
  // Core data
  savedItems: T[];
  newItems: T[];
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Error states
  error: string | null;
  
  // Document reference
  documentId: string;
  
  // History tracking
  initialState: BaseSnapshot<T>;
}

export type BaseManagerAction<T> =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_SAVED_ITEMS'; payload: T[] }
  | { type: 'ADD_NEW_ITEM'; payload: T }
  | { type: 'UPDATE_ITEM'; payload: { id: string; item: T } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'COMMIT_CHANGES' }
  | { type: 'DISCARD_ALL_CHANGES' };

export interface ItemComparator<T> {
  getId: (item: T) => string;
  areEqual: (a: T, b: T) => boolean;
}

export interface ApiAdapter<T, CreateType> {
  fetch: (documentId: string) => Promise<Result<T[], unknown>>;
  create: (documentId: string, data: CreateType) => Promise<Result<T, unknown>>;
  update: (id: string, data: Partial<T>) => Promise<Result<void, unknown>>;
  delete: (id: string) => Promise<Result<void, unknown>>;
  transformForCreate: (item: T) => CreateType;
  transformForUpdate: (item: T) => Partial<T>;
}

export abstract class BaseManager<T, CreateType> {
  protected state: BaseManagerState<T>;
  protected listeners: Set<(state: BaseManagerState<T>) => void> = new Set();
  protected comparator: ItemComparator<T>;
  protected apiAdapter: ApiAdapter<T, CreateType>;

  constructor(
    documentId: string,
    comparator: ItemComparator<T>,
    apiAdapter: ApiAdapter<T, CreateType>,
    initialState?: Partial<BaseManagerState<T>>
  ) {
    this.comparator = comparator;
    this.apiAdapter = apiAdapter;
    this.state = {
      savedItems: [],
      newItems: [],
      isLoading: false,
      isSaving: false,
      error: null,
      documentId,
      initialState: {
        savedItems: [],
        newItems: [],
        timestamp: Date.now(),
      },
      ...initialState,
    };
  }

  // State access
  getState(): BaseManagerState<T> {
    return {
      ...this.state,
      savedItems: [...this.state.savedItems],
      newItems: [...this.state.newItems],
      initialState: {
        ...this.state.initialState,
        savedItems: [...this.state.initialState.savedItems],
        newItems: [...this.state.initialState.newItems]
      },
    };
  }

  // Subscription management
  subscribe(listener: (state: BaseManagerState<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  protected notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Core action processing
  protected processBaseAction(action: BaseManagerAction<T>): boolean {
    switch (action.type) {
      case 'SET_LOADING':
        this.state.isLoading = action.payload;
        return true;

      case 'SET_SAVING':
        this.state.isSaving = action.payload;
        return true;

      case 'SET_ERROR':
        this.state.error = action.payload;
        return true;

      case 'LOAD_SAVED_ITEMS':
        this.state.savedItems = action.payload;
        this.state.newItems = [];
        this.state.isLoading = false;
        this.state.error = null;
        // Set initial state when loading from server
        this.state.initialState = {
          savedItems: [...action.payload],
          newItems: [],
          timestamp: Date.now(),
        };
        return true;

      case 'ADD_NEW_ITEM':
        this.state.newItems.push(action.payload);
        this.state.error = null;
        return true;

      case 'UPDATE_ITEM':
        const { id: updateId, item: updatedItem } = action.payload;
        let itemUpdated = false;
        
        // Update in saved items
        const savedUpdateIndex = this.state.savedItems.findIndex(item => 
          this.comparator.getId(item) === updateId
        );
        if (savedUpdateIndex >= 0) {
          this.state.savedItems[savedUpdateIndex] = updatedItem;
          itemUpdated = true;
        }
        
        // Update in new items
        const newUpdateIndex = this.state.newItems.findIndex(item => 
          this.comparator.getId(item) === updateId
        );
        if (newUpdateIndex >= 0) {
          this.state.newItems[newUpdateIndex] = updatedItem;
          itemUpdated = true;
        }
        
        if (!itemUpdated) {
          console.warn(`Item with id ${updateId} not found for update`);
        }
        return true;

      case 'DELETE_ITEM':
        const deleteId = action.payload;
        
        // Remove from saved items
        this.state.savedItems = this.state.savedItems.filter(item => 
          this.comparator.getId(item) !== deleteId
        );
        
        // Remove from new items
        this.state.newItems = this.state.newItems.filter(item => 
          this.comparator.getId(item) !== deleteId
        );
        
        this.state.error = null;
        return true;

      case 'CLEAR_ALL':
        this.state.savedItems = [];
        this.state.newItems = [];
        this.state.error = null;
        return true;

      case 'COMMIT_CHANGES':
        // Move new items to saved items and reset initial state
        this.state.savedItems = [...this.state.savedItems, ...this.state.newItems];
        this.state.newItems = [];
        this.state.isSaving = false;
        this.state.error = null;
        // Update initial state to current state
        this.state.initialState = {
          savedItems: [...this.state.savedItems],
          newItems: [],
          timestamp: Date.now(),
        };
        return true;

      case 'DISCARD_ALL_CHANGES':
        // Reset to initial state
        this.state.savedItems = [...this.state.initialState.savedItems];
        this.state.newItems = [...this.state.initialState.newItems];
        this.state.error = null;
        return true;

      default:
        return false; // Action not handled by base class
    }
  }

  // Abstract method for domain-specific actions
  protected abstract processCustomAction(action: any): boolean;

  // Generic dispatch method
  dispatch(action: any) {
    const handled = this.processBaseAction(action) || this.processCustomAction(action);
    if (handled) {
      this.notify();
    }
  }

  // Computed getters
  getAllItems(): T[] {
    return [...this.state.savedItems, ...this.state.newItems];
  }

  getItemById(id: string): T | undefined {
    return this.getAllItems().find(item => this.comparator.getId(item) === id);
  }

  getItemCount(): number {
    return this.getAllItems().length;
  }

  hasItems(): boolean {
    return this.getAllItems().length > 0;
  }

  hasUnsavedChanges(): boolean {
    const changes = this.getPendingChanges();
    return changes.creates.length > 0 || changes.updates.length > 0 || changes.deletes.length > 0;
  }

  getPendingChanges(): PendingChanges<T> {
    const creates = [...this.state.newItems];
    
    // Find updates: saved items that differ from their initial state
    const updates = this.state.savedItems.filter(currentItem => {
      const initialItem = this.state.initialState.savedItems.find(
        initial => this.comparator.getId(initial) === this.comparator.getId(currentItem)
      );
      
      if (!initialItem) {
        // This item wasn't in the initial state - it's a new item that was already saved
        return false;
      }
      
      // Check if the item has changed from the initial state
      return !this.comparator.areEqual(currentItem, initialItem);
    });
    
    // Find deletes: items that exist in initial state but not in current saved items
    const deletes = this.state.initialState.savedItems.filter(initialItem => {
      return !this.state.savedItems.find(current => 
        this.comparator.getId(current) === this.comparator.getId(initialItem)
      );
    });
    
    return { creates, updates, deletes };
  }

  getPendingChangesCount(): number {
    const changes = this.getPendingChanges();
    return changes.creates.length + changes.updates.length + changes.deletes.length;
  }

  // API methods
  async loadItems(): Promise<Result<T[], unknown>> {
    this.dispatch({ type: 'SET_LOADING', payload: true });
    this.dispatch({ type: 'SET_ERROR', payload: null });

    const result = await this.apiAdapter.fetch(this.state.documentId);
    
    if (result.ok) {
      this.dispatch({ type: 'LOAD_SAVED_ITEMS', payload: result.value });
    } else {
      const errorMessage = 'Failed to load items';
      this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
      this.dispatch({ type: 'SET_LOADING', payload: false });
    }
    
    return result;
  }

  async saveAllChanges(): Promise<Result<void, unknown>> {
    const pendingChanges = this.getPendingChanges();
    
    if (pendingChanges.creates.length === 0 && pendingChanges.updates.length === 0 && pendingChanges.deletes.length === 0) {
      return { ok: true, value: undefined };
    }

    this.dispatch({ type: 'SET_SAVING', payload: true });
    this.dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const results = {
        creates: 0,
        updates: 0,
        deletes: 0,
        errors: 0,
      };

      // Handle creates (new items)
      for (const item of pendingChanges.creates) {
        try {
          const createData = this.apiAdapter.transformForCreate(item);
          const result = await this.apiAdapter.create(this.state.documentId, createData);
          
          if (result.ok) {
            results.creates++;
            // Update the local item with the server-assigned data
            this.dispatch({ type: 'UPDATE_ITEM', payload: { id: this.comparator.getId(item), item: result.value } });
          } else {
            results.errors++;
            console.error('Failed to create item:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error creating item:', error);
        }
      }

      // Handle updates (modified saved items)
      for (const item of pendingChanges.updates) {
        try {
          const updateData = this.apiAdapter.transformForUpdate(item);
          const result = await this.apiAdapter.update(this.comparator.getId(item), updateData);
          
          if (result.ok) {
            results.updates++;
          } else {
            results.errors++;
            console.error('Failed to update item:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error updating item:', error);
        }
      }

      // Handle deletes (removed saved items)
      for (const item of pendingChanges.deletes) {
        try {
          const result = await this.apiAdapter.delete(this.comparator.getId(item));
          
          if (result.ok) {
            results.deletes++;
          } else {
            results.errors++;
            console.error('Failed to delete item:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error deleting item:', error);
        }
      }

      if (results.errors === 0) {
        // All operations successful - commit changes
        this.dispatch({ type: 'COMMIT_CHANGES' });
        return { ok: true, value: undefined };
      } else {
        const errorMessage = `Failed to save ${results.errors} change(s)`;
        this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
        this.dispatch({ type: 'SET_SAVING', payload: false });
        return { ok: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
      this.dispatch({ type: 'SET_SAVING', payload: false });
      return { ok: false, error };
    }
  }

  // Convenience methods
  addItemLocally(item: T): T {
    this.dispatch({ type: 'ADD_NEW_ITEM', payload: item });
    return item;
  }

  updateItem(id: string, updates: Partial<T>): boolean {
    const existingItem = this.getItemById(id);
    if (!existingItem) {
      return false;
    }

    const updatedItem = {
      ...existingItem,
      ...updates,
    };

    this.dispatch({ type: 'UPDATE_ITEM', payload: { id, item: updatedItem } });
    return true;
  }

  deleteItemLocally(id: string): boolean {
    const existingItem = this.getItemById(id);
    if (!existingItem) {
      return false;
    }

    this.dispatch({ type: 'DELETE_ITEM', payload: id });
    return true;
  }

  clearAll(): void {
    this.dispatch({ type: 'CLEAR_ALL' });
  }

  discardAllChanges(): void {
    this.dispatch({ type: 'DISCARD_ALL_CHANGES' });
  }
}
