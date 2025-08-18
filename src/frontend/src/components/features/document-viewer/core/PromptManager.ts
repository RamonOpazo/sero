/**
 * Prompt Manager
 * 
 * Manages prompts for a document following the same pattern as SelectionManager:
 * - Single source of truth for prompts
 * - Clear separation of concerns
 * - API integration for CRUD operations
 * - No UI state mixed with business logic
 */

import { type PromptType, type PromptCreateType } from '@/types';
import { api } from '@/lib/axios';
import { type Result } from '@/lib/result';

export interface PromptManagerState {
  // Core prompt data
  prompts: PromptType[];
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: string | null; // ID of prompt being deleted
  
  // Error states
  error: string | null;
  
  // Document reference
  documentId: string;
}

export type PromptManagerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'SET_DELETING'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_PROMPTS'; payload: PromptType[] }
  | { type: 'ADD_PROMPT'; payload: PromptType }
  | { type: 'REMOVE_PROMPT'; payload: string }
  | { type: 'CLEAR_PROMPTS' };

class PromptManager {
  private state: PromptManagerState;
  private listeners: Set<(state: PromptManagerState) => void> = new Set();

  constructor(documentId: string, initialPrompts?: PromptType[]) {
    this.state = {
      prompts: initialPrompts || [],
      isLoading: false,
      isCreating: false,
      isDeleting: null,
      error: null,
      documentId,
    };
  }

  // State access
  getState(): PromptManagerState {
    return {
      ...this.state,
      prompts: [...this.state.prompts],
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

      case 'SET_ERROR':
        this.state.error = action.payload;
        break;

      case 'LOAD_PROMPTS':
        this.state.prompts = action.payload;
        this.state.isLoading = false;
        this.state.error = null;
        break;

      case 'ADD_PROMPT':
        this.state.prompts.push(action.payload);
        this.state.isCreating = false;
        this.state.error = null;
        break;

      case 'REMOVE_PROMPT':
        this.state.prompts = this.state.prompts.filter(p => p.id !== action.payload);
        this.state.isDeleting = null;
        this.state.error = null;
        break;

      case 'CLEAR_PROMPTS':
        this.state.prompts = [];
        this.state.error = null;
        break;

      default:
        return; // No state change
    }

    this.notify();
  }

  // API methods
  async loadPrompts(): Promise<Result<PromptType[], unknown>> {
    this.dispatch({ type: 'SET_LOADING', payload: true });
    this.dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await api.safe.get<PromptType[]>(`/documents/id/${this.state.documentId}/prompts`);
      
      if (result.ok) {
        this.dispatch({ type: 'LOAD_PROMPTS', payload: result.value });
        return result;
      } else {
        const errorMessage = 'Failed to load prompts';
        this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
        this.dispatch({ type: 'SET_LOADING', payload: false });
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
      this.dispatch({ type: 'SET_LOADING', payload: false });
      return { ok: false, error };
    }
  }

  async createPrompt(promptData: PromptCreateType): Promise<Result<PromptType, unknown>> {
    this.dispatch({ type: 'SET_CREATING', payload: true });
    this.dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Ensure document_id is set
      const createData = {
        ...promptData,
        document_id: this.state.documentId,
      };

      const result = await api.safe.post<PromptType>(`/documents/id/${this.state.documentId}/prompts`, createData);
      
      if (result.ok) {
        this.dispatch({ type: 'ADD_PROMPT', payload: result.value });
        return result;
      } else {
        const errorMessage = 'Failed to create prompt';
        this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
        this.dispatch({ type: 'SET_CREATING', payload: false });
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
      this.dispatch({ type: 'SET_CREATING', payload: false });
      return { ok: false, error };
    }
  }

  async deletePrompt(promptId: string): Promise<Result<void, unknown>> {
    this.dispatch({ type: 'SET_DELETING', payload: promptId });
    this.dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await api.safe.delete(`/prompts/id/${promptId}`);
      
      if (result.ok) {
        this.dispatch({ type: 'REMOVE_PROMPT', payload: promptId });
        return { ok: true, value: undefined };
      } else {
        const errorMessage = 'Failed to delete prompt';
        this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
        this.dispatch({ type: 'SET_DELETING', payload: null });
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dispatch({ type: 'SET_ERROR', payload: errorMessage });
      this.dispatch({ type: 'SET_DELETING', payload: null });
      return { ok: false, error };
    }
  }

  // Utility methods
  getPromptById(id: string): PromptType | undefined {
    return this.state.prompts.find(p => p.id === id);
  }

  getPromptCount(): number {
    return this.state.prompts.length;
  }

  hasPrompts(): boolean {
    return this.state.prompts.length > 0;
  }
}

export default PromptManager;
