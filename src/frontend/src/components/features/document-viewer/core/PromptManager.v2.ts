/**
 * Simplified Prompt Manager using BaseManager abstraction
 * 
 * Focuses only on prompt-specific logic while inheriting common patterns from BaseManager
 */

import type { PromptType, PromptCreateType } from '@/types';
import type { Result } from '@/lib/result';
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import { 
  BaseManager, 
  type BaseManagerState, 
  type BaseManagerAction,
  type ItemComparator,
  type ApiAdapter,
  type PendingChanges
} from './BaseManager';

// Domain-specific types (extend base types as needed)
export interface PromptManagerState extends BaseManagerState<PromptType> {
  // Prompt-specific loading states
  isCreating: boolean;
  isDeleting: string | null;
  isClearing: boolean;
}

export type PromptManagerAction = 
  | BaseManagerAction<PromptType>
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'SET_DELETING'; payload: string | null }
  | { type: 'SET_CLEARING'; payload: boolean };

export type PendingPromptChanges = PendingChanges<PromptType>;

// Prompt-specific implementations
const promptComparator: ItemComparator<PromptType> = {
  getId: (prompt: PromptType) => prompt.id,
  areEqual: (a: PromptType, b: PromptType) => (
    a.text === b.text &&
    a.temperature === b.temperature &&
    JSON.stringify(a.languages) === JSON.stringify(b.languages)
  )
};

const promptApiAdapter: ApiAdapter<PromptType, PromptCreateType> = {
  fetch: (documentId: string) => DocumentViewerAPI.fetchDocumentPrompts(documentId),
  create: (documentId: string, data: PromptCreateType) => DocumentViewerAPI.createPrompt(documentId, data),
  update: (id: string, data: Partial<PromptType>) => DocumentViewerAPI.updatePrompt(id, data),
  delete: (id: string) => DocumentViewerAPI.deletePrompt(id),
  transformForCreate: (prompt: PromptType): PromptCreateType => ({
    text: prompt.text,
    temperature: prompt.temperature,
    languages: prompt.languages,
    document_id: prompt.document_id,
  }),
  transformForUpdate: (prompt: PromptType) => ({
    text: prompt.text,
    temperature: prompt.temperature,
    languages: prompt.languages,
  })
};

class PromptManager extends BaseManager<PromptType, PromptCreateType> {
  constructor(documentId: string, initialState?: Partial<PromptManagerState>) {
    super(documentId, promptComparator, promptApiAdapter, {
      // Base state will be merged with these prompt-specific defaults
      isCreating: false,
      isDeleting: null,
      isClearing: false,
      ...initialState,
    });
  }

  // Override getState to return prompt-specific state
  getState(): PromptManagerState {
    const baseState = super.getState();
    return {
      ...baseState,
      // Add prompt-specific states
      isCreating: (this.state as PromptManagerState).isCreating,
      isDeleting: (this.state as PromptManagerState).isDeleting,
      isClearing: (this.state as PromptManagerState).isClearing,
      // Map base names to domain-specific names for backward compatibility
      savedPrompts: baseState.savedItems,
      newPrompts: baseState.newItems,
    } as PromptManagerState;
  }

  // Handle prompt-specific actions
  protected processCustomAction(action: PromptManagerAction): boolean {
    switch (action.type) {
      case 'SET_CREATING':
        (this.state as PromptManagerState).isCreating = action.payload;
        return true;

      case 'SET_DELETING':
        (this.state as PromptManagerState).isDeleting = action.payload;
        return true;

      case 'SET_CLEARING':
        (this.state as PromptManagerState).isClearing = action.payload;
        return true;

      default:
        return false;
    }
  }

  // Domain-specific utility methods
  private generateId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Domain-specific convenience methods (maintain existing API)
  getAllPrompts(): PromptType[] {
    return this.getAllItems();
  }

  getPromptById(id: string): PromptType | undefined {
    return this.getItemById(id);
  }

  getPromptCount(): number {
    return this.getItemCount();
  }

  hasPrompts(): boolean {
    return this.hasItems();
  }

  getPendingChanges(): PendingPromptChanges {
    return super.getPendingChanges();
  }

  // API methods - maintain existing interface
  async loadPrompts(): Promise<Result<PromptType[], unknown>> {
    return this.loadItems();
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

    return this.addItemLocally(newPrompt);
  }

  updatePrompt(id: string, updates: Partial<PromptType>): boolean {
    return this.updateItem(id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  }

  deletePromptLocally(id: string): boolean {
    return this.deleteItemLocally(id);
  }
}

export default PromptManager;
