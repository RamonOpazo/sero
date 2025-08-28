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
  async updatePrompt(promptId: string, updates: Partial<Pick<PromptType, 'title' | 'prompt' | 'directive' | 'scope' | 'state'>>): Promise<Result<void, unknown>> {
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

  /**
   * Delete all prompts for a document
   */
  async clearDocumentPrompts(documentId: string): Promise<Result<{ message: string; detail?: any }, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.delete(`/prompts/by-document/id/${documentId}`) as Promise<Result<{ message: string; detail?: any }, unknown>>)
      .tap((resp) => {
        toast.success('All prompts deleted', { description: resp?.message ?? '' } as any);
      })
      .catch((error: unknown) => {
        toast.error('Failed to clear prompts', { description: 'Please try again.' });
        throw error;
      })
      .toResult();
  },

  // ===== SELECTION OPERATIONS =====

  /**
   * Apply AI to generate staged selections (committed=false)
   */
  async applyAi(documentId: string, opts?: { keyId?: string; encryptedPassword?: string }): Promise<Result<{ selections: SelectionType[]; telemetry: { min_confidence: number; returned: number; filtered_out: number; staged: number } }, unknown>> {
    // Centralized AI endpoint; increase timeout to accommodate cold model load in Ollama
    return AsyncResultWrapper
      .from(
        api.safe.post<{ selections: SelectionType[]; telemetry: { min_confidence: number; returned: number; filtered_out: number; staged: number } }>(
          `/ai/apply`,
          { document_id: documentId, key_id: opts?.keyId ?? null, encrypted_password: opts?.encryptedPassword ?? null } as any,
          { timeout: 120_000 },
        )
      )
      .catch((error: unknown) => {
        toast.error("Failed to apply AI", { description: error instanceof Error ? error.message : "Please try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Stream AI apply progress via POST + SSE-like event parsing.
   * Returns a cancel function to abort streaming.
   */
  applyAiStream(
    documentId: string,
    handlers: {
      onStatus?: (data: {
        stage: string;
        stage_index?: number;
        stage_total?: number;
        percent?: number;
        subtask?: string;
        // Enhanced telemetry around request_sent stage
        provider_ok?: boolean; // connecting_provider
        model_listed?: boolean; // model_catalog
        message?: string; // optional details/warnings
        document_id?: string;
      }) => void;
      onModel?: (data: { name: string; document_id?: string }) => void;
      onTokens?: (data: { chars: number; document_id?: string }) => void;
      onStagingProgress?: (data: { created: number; total: number; percent?: number; document_id?: string }) => void;
      onSummary?: (data: { returned: number; filtered_out: number; staged: number; min_confidence: number; document_id?: string }) => void;
      onCompleted?: (data: { ok: boolean; reason?: string }) => void;
      onError?: (data: { message: string; document_id?: string }) => void;
    } & { keyId?: string; encryptedPassword?: string }
  ): { cancel: () => void } {
    const controller = new AbortController();
    const signal = controller.signal;

    // Simple SSE parser for lines of form: `event: name` and `data: {...}`
    const parseStream = async () => {
      try {
        const resp = await fetch(`/api/ai/apply/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: documentId, key_id: (handlers as any)?.keyId ?? null, encrypted_password: (handlers as any)?.encryptedPassword ?? null }),
          signal,
        });
        if (!resp.ok || !resp.body) {
          throw new Error(`Stream failed: ${resp.status}`);
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let currentEvent: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const lines = chunk.split('\n');
            currentEvent = null;
            let dataLine = '';
            for (const ln of lines) {
              if (ln.startsWith('event: ')) currentEvent = ln.slice(7).trim();
              if (ln.startsWith('data: ')) dataLine = ln.slice(6).trim();
            }
            if (!currentEvent || !dataLine) continue;
            try {
              const payload = JSON.parse(dataLine);
              switch (currentEvent) {
                case 'status': handlers.onStatus?.(payload); break;
                case 'model': handlers.onModel?.(payload); break;
                case 'tokens': handlers.onTokens?.(payload); break;
                case 'staging_progress': handlers.onStagingProgress?.(payload); break;
                case 'summary': handlers.onSummary?.(payload); break;
                case 'project_init': (handlers as any).onProjectInit?.(payload); break;
                case 'project_progress': (handlers as any).onProjectProgress?.(payload); break;
                case 'project_doc_start': (handlers as any).onProjectDocStart?.(payload); break;
                case 'project_doc_summary': (handlers as any).onProjectDocSummary?.(payload); break;
                case 'completed': handlers.onCompleted?.(payload); break;
                case 'error': handlers.onError?.(payload); break;
                default: break;
              }
            } catch (e) {
              // ignore JSON parse errors
            }
          }
        }
      } catch (err: any) {
        handlers.onError?.({ message: err?.message ?? 'stream-error' });
      }
    };

    // kick off parsing without awaiting
    void parseStream();

    return {
      cancel: () => controller.abort(),
    };
  },

  /**
   * Stream AI apply for an entire project (batch) with project-level events.
   */
  applyAiProjectStream(
    projectId: string,
    handlers: {
      onProjectInit?: (data: { total_documents: number }) => void;
      onProjectProgress?: (data: { processed: number; total: number }) => void;
      onProjectDocStart?: (data: { index: number; document_id: string }) => void;
      onProjectDocSummary?: (data: { document_id: string; returned: number; filtered_out: number; staged: number; min_confidence: number }) => void;
      onStatus?: (data: {
        stage: string;
        stage_index?: number;
        stage_total?: number;
        percent?: number;
        subtask?: string;
        provider_ok?: boolean;
        model_listed?: boolean;
        message?: string;
        document_id?: string;
      }) => void;
      onModel?: (data: { name: string; document_id?: string }) => void;
      onTokens?: (data: { chars: number; document_id?: string }) => void;
      onStagingProgress?: (data: { created: number; total: number; percent?: number; document_id?: string }) => void;
      onCompleted?: (data: { ok: boolean }) => void;
      onError?: (data: { message: string; document_id?: string }) => void;
    } & { keyId?: string; encryptedPassword?: string }
  ): { cancel: () => void } {
    // Reuse the SSE parser; we just change the URL and handlers shape
    const controller = new AbortController();
    const signal = controller.signal;

    const parseStream = async () => {
      try {
        const resp = await fetch(`/api/ai/apply/project/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, key_id: (handlers as any)?.keyId ?? null, encrypted_password: (handlers as any)?.encryptedPassword ?? null }),
          signal,
        });
        if (!resp.ok || !resp.body) throw new Error(`Stream failed: ${resp.status}`);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let currentEvent: string | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const lines = chunk.split('\n');
            currentEvent = null;
            let dataLine = '';
            for (const ln of lines) {
              if (ln.startsWith('event: ')) currentEvent = ln.slice(7).trim();
              if (ln.startsWith('data: ')) dataLine = ln.slice(6).trim();
            }
            if (!currentEvent || !dataLine) continue;
            try {
              const payload = JSON.parse(dataLine);
              switch (currentEvent) {
                case 'project_init': handlers.onProjectInit?.(payload); break;
                case 'project_progress': handlers.onProjectProgress?.(payload); break;
                case 'project_doc_start': handlers.onProjectDocStart?.(payload); break;
                case 'project_doc_summary': handlers.onProjectDocSummary?.(payload); break;
                case 'status': handlers.onStatus?.(payload); break;
                case 'model': handlers.onModel?.(payload); break;
                case 'tokens': handlers.onTokens?.(payload); break;
                case 'staging_progress': handlers.onStagingProgress?.(payload); break;
                case 'completed': handlers.onCompleted?.(payload); break;
                case 'error': handlers.onError?.(payload); break;
                default: break;
              }
            } catch { /* ignore */ }
          }
        }
      } catch (err: any) {
        handlers.onError?.({ message: err?.message ?? 'stream-error' });
      }
    };

    void parseStream();
    return { cancel: () => controller.abort() };
  },

  /**
   * Commit staged selections (by IDs or all)
   */
  async commitStagedSelections(documentId: string, args: { selection_ids?: string[]; commit_all?: boolean }): Promise<Result<SelectionType[], unknown>> {
    const payload = {
      selection_ids: args.selection_ids ?? null,
      commit_all: Boolean(args.commit_all),
    };
    return AsyncResultWrapper
      .from(api.safe.patch(`/documents/id/${documentId}/selections/commit`, payload) as Promise<Result<SelectionType[], unknown>>)
      .catch((error: unknown) => {
        toast.error("Failed to commit selections", { description: "Please try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Clear staged selections (by IDs or all)
   */
  async clearStagedSelections(documentId: string, args: { selection_ids?: string[]; clear_all?: boolean }): Promise<Result<{ success: boolean; message?: string }, unknown>> {
    const payload = {
      selection_ids: args.selection_ids ?? null,
      clear_all: Boolean(args.clear_all),
    };
    return AsyncResultWrapper
      .from(api.safe.post(`/documents/id/${documentId}/selections/staged/clear`, payload) as Promise<Result<{ success: boolean; message?: string }, unknown>>)
      .catch((error: unknown) => {
        toast.error("Failed to clear staged selections", { description: "Please try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Uncommit selections (by IDs or all)
   */
  async uncommitSelections(documentId: string, args: { selection_ids?: string[]; uncommit_all?: boolean }): Promise<Result<SelectionType[], unknown>> {
    const payload = {
      selection_ids: args.selection_ids ?? null,
      uncommit_all: Boolean(args.uncommit_all),
    };
    return AsyncResultWrapper
      .from(api.safe.patch(`/documents/id/${documentId}/selections/uncommit`, payload) as Promise<Result<SelectionType[], unknown>>)
      .catch((error: unknown) => {
        toast.error("Failed to uncommit selections", { description: "Please try again." });
        throw error;
      })
      .toResult();
  },

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
  async updateSelection(selectionId: string, updates: Partial<Pick<SelectionType, 'x' | 'y' | 'width' | 'height' | 'page_number' | 'confidence' | 'state' | 'scope'>>): Promise<Result<void, unknown>> {
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
   * Convert a committed selection to staged edition (explicit)
   */
  async convertSelectionToStaged(selectionId: string): Promise<Result<SelectionType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.patch<SelectionType>(`/selections/id/${selectionId}/convert-to-staged`))
      .catch((error: unknown) => {
        console.error('Failed to convert selection to staged:', error);
        throw error;
      })
      .toResult();
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
