/**
 * Prompt Manager
 * 
 * Manages prompts for a document following the same pattern as SelectionManager:
 * - Single source of truth for prompts
 * - Clear separation of concerns
 * - savedPrompts/newPrompts split for pending changes tracking
 * - No UI state mixed with business logic
 */

import type { PromptType, PromptCreateType } from '@/types';
import type { Result } from '@/lib/result';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';

export interface PendingPromptChanges {
  creates: PromptType[]; // New prompts to be created
  updates: PromptType[]; // Modified saved prompts to be updated 
  deletes: PromptType[]; // Saved prompts that have been deleted
}

interface PromptSnapshot {
  savedPrompts: PromptType[];
  newPrompts: PromptType[];
  timestamp: number;
}

export interface PromptManagerState {
  // Core prompt data
  savedPrompts: PromptType[];
  newPrompts: PromptType[];
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: string | null; // ID of prompt being deleted
  isClearing: boolean; // Bulk operations like clear all
  isSaving: boolean; // For bulk save operations
  
  // Error states
  error: string | null;
  
  // Document reference
  documentId: string;
  
  // History - tracks changes from initial state
  initialState: PromptSnapshot; // The starting point (loaded prompts or empty)
}

export type PromptManagerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'SET_DELETING'; payload: string | null }
  | { type: 'SET_CLEARING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_SAVED_PROMPTS'; payload: PromptType[] }
  | { type: 'ADD_NEW_PROMPT'; payload: PromptType }
  | { type: 'UPDATE_PROMPT'; payload: { id: string; prompt: PromptType } }
  | { type: 'DELETE_PROMPT'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'COMMIT_CHANGES' } // Resets initial state to current state after successful save
  | { type: 'DISCARD_ALL_CHANGES' }; // Resets current state to initial state

class PromptManager {
  private state: PromptManagerState;
  private listeners: Set<(state: PromptManagerState) => void> = new Set();

  constructor(documentId: string, initialState?: Partial<PromptManagerState>) {
    this.state = {
      savedPrompts: [],
      newPrompts: [],
      isLoading: false,
      isCreating: false,
      isDeleting: null,
      isClearing: false,
      isSaving: false,
      error: null,
      documentId,
      initialState: {
        savedPrompts: [],
        newPrompts: [],
        timestamp: Date.now(),
      },
      ...initialState,
    };
  }

  // State access
  getState(): PromptManagerState {
    return {
      ...this.state,
      savedPrompts: [...this.state.savedPrompts],
      newPrompts: [...this.state.newPrompts],
      initialState: {
        ...this.state.initialState,
        savedPrompts: [...this.state.initialState.savedPrompts],
        newPrompts: [...this.state.initialState.newPrompts]
      },
    };
  }

  // Subscription management
  subscribe(listener: (state: PromptManagerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Core actions
  dispatch(action: PromptManagerAction) {
    switch (action.type) {
      case 'SET_LOADING':
        this.state.isLoading = action.payload;
        break;

      case 'SET_CREATING':
        this.state.isCreating = action.payload;
        break;

      case 'SET_DELETING':
        this.state.isDeleting = action.payload;
        break;

      case 'SET_CLEARING':
        this.state.isClearing = action.payload;
        break;

      case 'SET_SAVING':
        this.state.isSaving = action.payload;
        break;

      case 'SET_ERROR':
        this.state.error = action.payload;
        break;

      case 'LOAD_SAVED_PROMPTS':
        this.state.savedPrompts = action.payload;
        this.state.newPrompts = [];
        this.state.isLoading = false;
        this.state.error = null;
        // Set initial state when loading from server
        this.state.initialState = {
          savedPrompts: [...action.payload],
          newPrompts: [],
          timestamp: Date.now(),
        };
        break;

      case 'ADD_NEW_PROMPT':
        // Add to newPrompts array for local management
        this.state.newPrompts.push(action.payload);
        this.state.isCreating = false;
        this.state.error = null;
        break;

      case 'UPDATE_PROMPT':
        const { id: updateId, prompt: updatedPrompt } = action.payload;
        let promptUpdated = false;
        
        // Update in saved prompts
        const savedUpdateIndex = this.state.savedPrompts.findIndex(p => p.id === updateId);
        if (savedUpdateIndex >= 0) {
          this.state.savedPrompts[savedUpdateIndex] = updatedPrompt;
          promptUpdated = true;
        }
        
        // Update in new prompts
        const newUpdateIndex = this.state.newPrompts.findIndex(p => p.id === updateId);
        if (newUpdateIndex >= 0) {
          this.state.newPrompts[newUpdateIndex] = updatedPrompt;
          promptUpdated = true;
        }
        
        if (!promptUpdated) {
          console.warn(`Prompt with id ${updateId} not found for update`);
        }
        break;

      case 'DELETE_PROMPT':
        const deleteId = action.payload;
        
        // Remove from saved prompts
        this.state.savedPrompts = this.state.savedPrompts.filter(p => p.id !== deleteId);
        
        // Remove from new prompts
        this.state.newPrompts = this.state.newPrompts.filter(p => p.id !== deleteId);
        
        this.state.isDeleting = null;
        this.state.error = null;
        break;

      case 'CLEAR_ALL':
        this.state.savedPrompts = [];
        this.state.newPrompts = [];
        this.state.isClearing = false;
        this.state.error = null;
        break;

      case 'COMMIT_CHANGES':
        // Move new prompts to saved prompts and reset initial state
        this.state.savedPrompts = [...this.state.savedPrompts, ...this.state.newPrompts];
        this.state.newPrompts = [];
        this.state.isSaving = false;
        this.state.error = null;
        // Update initial state to current state
        this.state.initialState = {
          savedPrompts: [...this.state.savedPrompts],
          newPrompts: [],
          timestamp: Date.now(),
        };
        break;

      case 'DISCARD_ALL_CHANGES':
        // Reset to initial state
        this.state.savedPrompts = [...this.state.initialState.savedPrompts];
        this.state.newPrompts = [...this.state.initialState.newPrompts];
        this.state.error = null;
        break;

      default:
        return; // No state change
    }

    this.notify();
  }

  // Utility methods
  private generateId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Computed getters
  getAllPrompts(): PromptType[] {
    return [...this.state.savedPrompts, ...this.state.newPrompts];
  }

  getPromptById(id: string): PromptType | undefined {
    return this.getAllPrompts().find(p => p.id === id);
  }

  getPromptCount(): number {
    return this.getAllPrompts().length;
  }

  hasPrompts(): boolean {
    return this.getAllPrompts().length > 0;
  }

  hasUnsavedChanges(): boolean {
    const changes = this.getPendingChanges();
    return changes.creates.length > 0 || changes.updates.length > 0 || changes.deletes.length > 0;
  }

  getPendingChanges(): PendingPromptChanges {
    const creates = [...this.state.newPrompts];
    
    // Find updates: saved prompts that differ from their initial state
    const updates = this.state.savedPrompts.filter(currentPrompt => {
      const initialPrompt = this.state.initialState.savedPrompts.find(
        initial => initial.id === currentPrompt.id
      );
      
      if (!initialPrompt) {
        // This prompt wasn't in the initial state - it's a new prompt that was already saved
        return false;
      }
      
      // Check if any properties have changed from the initial state
      return (
        currentPrompt.text !== initialPrompt.text ||
        currentPrompt.temperature !== initialPrompt.temperature ||
        JSON.stringify(currentPrompt.languages) !== JSON.stringify(initialPrompt.languages)
      );
    });
    
    // Find deletes: prompts that exist in initial state but not in current saved prompts
    const deletes = this.state.initialState.savedPrompts.filter(initialPrompt => {
      return !this.state.savedPrompts.find(current => current.id === initialPrompt.id);
    });
    
    return { creates, updates, deletes };
  }

  getPendingChangesCount(): number {
    const changes = this.getPendingChanges();
    return changes.creates.length + changes.updates.length + changes.deletes.length;
  }

  // API methods - now follow the pattern of not saving immediately
  async loadPrompts(): Promise<Result<PromptType[], unknown>> {
    this.dispatch({ type: 'SET_LOADING', payload: true });
    this.dispatch({ type: 'SET_ERROR', payload: null });

    const result = await DocumentViewerAPI.fetchDocumentPrompts(this.state.documentId);
    
    if (result.ok) {
      this.dispatch({ type: 'LOAD_SAVED_PROMPTS', payload: result.value });
      this.dispatch({ type: 'SET_LOADING', payload: false });
    } else {
      const errorMessage = 'Failed to load prompts';
      this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
      this.dispatch({ type: 'SET_LOADING', payload: false });
    }
    
    return result;
  }

  // Add prompt locally (not saved to server until saveAllChanges is called)
  addPromptLocally(promptData: Omit<PromptCreateType, 'document_id'>): PromptType {
    const newPrompt: PromptType = {
      id: this.generateId(),
      text: promptData.text,
      temperature: promptData.temperature,
      languages: promptData.languages,
      document_id: this.state.documentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.dispatch({ type: 'ADD_NEW_PROMPT', payload: newPrompt });
    return newPrompt;
  }

  updatePrompt(id: string, updates: Partial<PromptType>): boolean {
    const existingPrompt = this.getPromptById(id);
    if (!existingPrompt) {
      return false;
    }

    const updatedPrompt = {
      ...existingPrompt,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.dispatch({ type: 'UPDATE_PROMPT', payload: { id, prompt: updatedPrompt } });
    return true;
  }

  deletePromptLocally(id: string): boolean {
    const existingPrompt = this.getPromptById(id);
    if (!existingPrompt) {
      return false;
    }

    this.dispatch({ type: 'DELETE_PROMPT', payload: id });
    return true;
  }

  clearAll(): void {
    this.dispatch({ type: 'CLEAR_ALL' });
  }

  discardAllChanges(): void {
    this.dispatch({ type: 'DISCARD_ALL_CHANGES' });
  }

  // Save all pending changes to server
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

      // Handle creates (new prompts)
      for (const prompt of pendingChanges.creates) {
        try {
          const createData: PromptCreateType = {
            text: prompt.text,
            temperature: prompt.temperature,
            languages: prompt.languages,
            document_id: this.state.documentId,
          };

          const result = await DocumentViewerAPI.createPrompt(this.state.documentId, createData);
          
          if (result.ok) {
            results.creates++;
            // Update the local prompt with the server-assigned ID
            this.dispatch({ type: 'UPDATE_PROMPT', payload: { id: prompt.id, prompt: result.value } });
          } else {
            results.errors++;
            console.error('Failed to create prompt:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error creating prompt:', error);
        }
      }

      // Handle updates (modified saved prompts)
      for (const prompt of pendingChanges.updates) {
        try {
          const updateData = {
            text: prompt.text,
            temperature: prompt.temperature,
            languages: prompt.languages,
          };

          const result = await DocumentViewerAPI.updatePrompt(prompt.id, updateData);
          
          if (result.ok) {
            results.updates++;
          } else {
            results.errors++;
            console.error('Failed to update prompt:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error updating prompt:', error);
        }
      }

      // Handle deletes (removed saved prompts)
      for (const prompt of pendingChanges.deletes) {
        try {
          const result = await DocumentViewerAPI.deletePrompt(prompt.id);
          
          if (result.ok) {
            results.deletes++;
          } else {
            results.errors++;
            console.error('Failed to delete prompt:', result.error);
          }
        } catch (error) {
          results.errors++;
          console.error('Error deleting prompt:', error);
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
}

export default PromptManager;
