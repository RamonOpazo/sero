import { toast } from 'sonner';
import type { PromptType, PromptCreateType, SelectionType, SelectionCreateType } from '@/types';
import { AsyncResultWrapper, type Result } from '@/lib/result';
import { api } from '@/lib/axios';

/**
 * Document Viewer API utility - centralized API operations for document-viewer features
 * 
 * This module provides a clean API layer for document-viewer operations:
 * - Prompt management (CRUD operations)
 * - Selection management (CRUD operations)
 */

export const DocumentViewerAPI = {
  // ===== PROMPT OPERATIONS =====
  
  /**
   * Fetch document prompts by document ID
   */
  async fetchDocumentPrompts(documentId: string): Promise<Result<PromptType[], unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get<PromptType[]>(`/documents/id/${documentId}/prompts`))
      .catch((error: unknown) => {
        toast.error(
          "Failed to load prompts",
          { description: "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Create a new prompt for a document
   */
  async createPrompt(documentId: string, promptData: Omit<PromptCreateType, 'document_id'>): Promise<Result<PromptType, unknown>> {
    const createData: PromptCreateType = {
      ...promptData,
      document_id: documentId,
    };

    return AsyncResultWrapper
      .from(api.safe.post<PromptType>(`/documents/id/${documentId}/prompts`, createData))
      .catch((error: unknown) => {
        console.error('Failed to create prompt:', error);
        throw error;
      })
      .toResult();
  },

  /**
   * Update an existing prompt
   */
  async updatePrompt(promptId: string, updates: Partial<Pick<PromptType, 'text' | 'temperature' | 'languages'>>): Promise<Result<void, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/prompts/id/${promptId}`, updates))
      .tap(() => void 0)
      .catch((error: unknown) => {
        console.error('Failed to update prompt:', error);
        throw error;
      })
      .toResult() as Promise<Result<void, unknown>>;
  },

  /**
   * Delete a prompt
   */
  async deletePrompt(promptId: string): Promise<Result<void, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.delete(`/prompts/id/${promptId}`))
      .tap(() => void 0)
      .catch((error: unknown) => {
        console.error('Failed to delete prompt:', error);
        throw error;
      })
      .toResult() as Promise<Result<void, unknown>>;
  },

  // ===== SELECTION OPERATIONS =====

  /**
   * Fetch document selections by document ID
   */
  async fetchDocumentSelections(documentId: string): Promise<Result<SelectionType[], unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get<SelectionType[]>(`/documents/id/${documentId}/selections`))
      .catch((error: unknown) => {
        toast.error(
          "Failed to load selections",
          { description: "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Create a new selection for a document
   */
  async createSelection(documentId: string, selectionData: Omit<SelectionCreateType, 'document_id'>): Promise<Result<SelectionType, unknown>> {
    const createData = {
      ...selectionData,
      document_id: documentId,
    };
    
    return AsyncResultWrapper
      .from(api.safe.post<SelectionType>(`/documents/id/${documentId}/selections`, createData))
      .catch((error: unknown) => {
        console.error('Failed to create selection:', error);
        throw error;
      })
      .toResult();
  },

  /**
   * Update an existing selection
   */
  async updateSelection(selectionId: string, updates: Partial<Pick<SelectionType, 'x' | 'y' | 'width' | 'height' | 'page_number' | 'confidence'>>): Promise<Result<void, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/selections/id/${selectionId}`, updates))
      .tap(() => void 0)
      .catch((error: unknown) => {
        console.error('Failed to update selection:', error);
        throw error;
      })
      .toResult() as Promise<Result<void, unknown>>;
  },

  /**
   * Delete a selection
   */
  async deleteSelection(selectionId: string): Promise<Result<void, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.delete(`/selections/id/${selectionId}`))
      .tap(() => void 0)
      .catch((error: unknown) => {
        console.error('Failed to delete selection:', error);
        throw error;
      })
      .toResult() as Promise<Result<void, unknown>>;
  },
};
