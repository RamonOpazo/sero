import { toast } from 'sonner';
import type { DocumentShallowType, FileType, PromptType, SelectionType } from '@/types';
import { AsyncResultWrapper, type Result } from '@/lib/result';
import { api } from '@/lib/axios';
import { encryptPasswordSecurely, isWebCryptoSupported } from '@/lib/crypto';

/**
 * Editor API utility - centralized editor operations
 * 
 * This module provides a clean API layer for editor operations that can be used by:
 * - useEditorView hook (for direct operations)
 * - Any other components that need editor API access
 */

export interface FileWithRelatedData {
  file: FileType;
  blob: Blob;
  prompts: PromptType[];
  selections: SelectionType[];
}

export const EditorAPI = {
  /**
   * Fetch document metadata by document ID
   */
  async fetchDocumentMetadata(documentId: string, projectId?: string): Promise<Result<DocumentShallowType, unknown>> {
    return await AsyncResultWrapper
      .from(api.safe.get(`/documents/id/${documentId}/shallow`) as Promise<Result<DocumentShallowType, unknown>>)
      .andThen((doc: DocumentShallowType) => {
        if (projectId && doc.project_id !== projectId) {
          return { ok: false, error: new Error('Document not found in project') } as Result<DocumentShallowType, unknown>;
        }
        return { ok: true, value: doc } as Result<DocumentShallowType, unknown>;
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to fetch document metadata",
          { description: "Please refresh the page to try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Load original file by document ID with password
   */
  async loadOriginalFile(documentId: string, password: string): Promise<Result<FileWithRelatedData, unknown>> {
    // Check Web Crypto API support
    if (!isWebCryptoSupported()) {
      const error = new Error('Web Crypto API not supported in this browser');
      return { ok: false, error };
    }

    return AsyncResultWrapper
      .from(Promise.all([
        // Get file blob using document-based endpoint
        (async (): Promise<Result<{ blob: Blob; fileName: string }, unknown>> => {
          try {
            // Encrypt the password using ephemeral RSA key
            const encryptedPasswordData = await encryptPasswordSecurely(password);
            
            // Send secure POST request to document-based endpoint
            const response = await api.safe.post(`/documents/id/${documentId}/download/original`, {
              key_id: encryptedPasswordData.keyId,
              encrypted_password: encryptedPasswordData.encryptedPassword,
              stream: false
            }, {
              responseType: "blob"
            });
            
            if (!response.ok) {
              return response;
            }
            
            // Generate a default filename
            const fileName = `document_${documentId}_original.pdf`;
            
            return { ok: true, value: { blob: response.value as Blob, fileName } };
            
          } catch (error) {
            return { ok: false, error };
          }
        })(),
        // TODO: Load prompts and selections from document endpoint
        // For now, return empty arrays
        Promise.resolve({ ok: true, value: [] } as Result<PromptType[], unknown>),
        Promise.resolve({ ok: true, value: [] } as Result<SelectionType[], unknown>)
      ]).then(async ([downloadResult, promptsResult, selectionsResult]) => {
        
        if (!downloadResult.ok) {
          return downloadResult;
        }
        if (!promptsResult.ok) {
          return promptsResult;
        }
        if (!selectionsResult.ok) {
          return selectionsResult;
        }

        // Create a synthetic file object since we don't have file metadata from document endpoint
        const syntheticFile: FileType = {
          id: `${documentId}-original`,
          created_at: new Date().toISOString(),
          updated_at: null,
          file_hash: 'unknown',
          file_type: 'original',
          file_size: downloadResult.value.blob.size,
          mime_type: 'application/pdf',
          data: '',
          salt: null,
          document_id: documentId
        };

        const fileWithData: FileWithRelatedData = {
          file: syntheticFile,
          blob: downloadResult.value.blob,
          prompts: promptsResult.value,
          selections: selectionsResult.value
        };

        return { ok: true, value: fileWithData } as Result<FileWithRelatedData, unknown>;
      }))
      .tap(() => {
        toast.success(
          "Original file loaded successfully",
          { description: `Loaded original file for document` }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to load original file",
          { description: error instanceof Error ? error.message : "Please check your password and try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Load original file by document ID using already-encrypted credentials
   */
  async loadOriginalFileEncrypted(
    documentId: string,
    creds: { keyId: string; encryptedPassword: string },
  ): Promise<Result<FileWithRelatedData, unknown>> {
    return AsyncResultWrapper
      .from(Promise.all([
        // Get file blob using document-based endpoint with provided encrypted credentials
        (async (): Promise<Result<{ blob: Blob; fileName: string }, unknown>> => {
          try {
            const response = await api.safe.post(`/documents/id/${documentId}/download/original`, {
              key_id: creds.keyId,
              encrypted_password: creds.encryptedPassword,
              stream: false,
            }, {
              responseType: 'blob',
            });
            if (!response.ok) {
              return response as any;
            }
            const fileName = `document_${documentId}_original.pdf`;
            return { ok: true, value: { blob: response.value as Blob, fileName } };
          } catch (error) {
            return { ok: false, error };
          }
        })(),
        // For now, return empty arrays for related data
        Promise.resolve({ ok: true, value: [] } as Result<PromptType[], unknown>),
        Promise.resolve({ ok: true, value: [] } as Result<SelectionType[], unknown>),
      ]).then(async ([downloadResult, promptsResult, selectionsResult]) => {
        if (!downloadResult.ok) return downloadResult;
        if (!promptsResult.ok) return promptsResult;
        if (!selectionsResult.ok) return selectionsResult;

        const syntheticFile: FileType = {
          id: `${documentId}-original`,
          created_at: new Date().toISOString(),
          updated_at: null,
          file_hash: 'unknown',
          file_type: 'original',
          file_size: downloadResult.value.blob.size,
          mime_type: 'application/pdf',
          data: '',
          salt: null,
          document_id: documentId,
        };
        const fileWithData: FileWithRelatedData = {
          file: syntheticFile,
          blob: downloadResult.value.blob,
          prompts: promptsResult.value,
          selections: selectionsResult.value,
        };
        return { ok: true, value: fileWithData } as Result<FileWithRelatedData, unknown>;
      }))
      .tap(() => {
        toast.success(
          'Original file loaded successfully',
          { description: 'Loaded original file for document' },
        );
      })
      .catch((error: unknown) => {
        toast.error(
          'Failed to load original file',
          { description: error instanceof Error ? error.message : 'Please try again.' },
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Load redacted file by document ID (no password required)
   */
  async loadRedactedFile(documentId: string): Promise<Result<FileWithRelatedData, unknown>> {
    return AsyncResultWrapper
      .from(Promise.all([
        // Get file blob using document-based endpoint (no password needed)
        (async (): Promise<Result<{ blob: Blob; fileName: string }, unknown>> => {
          try {
            // Send GET request to document-based redacted file endpoint
            const response = await api.safe.get(`/documents/id/${documentId}/download/redacted?ts=${Date.now()}`, {
              responseType: "blob"
            });
            
            if (!response.ok) {
              return response;
            }
            
            // Generate a default filename
            const fileName = `document_${documentId}_redacted.pdf`;
            
            return { ok: true, value: { blob: response.value as Blob, fileName } };
            
          } catch (error) {
            return { ok: false, error };
          }
        })(),
        // TODO: Load prompts and selections from document endpoint
        // For now, return empty arrays
        Promise.resolve({ ok: true, value: [] } as Result<PromptType[], unknown>),
        Promise.resolve({ ok: true, value: [] } as Result<SelectionType[], unknown>)
      ]).then(async ([downloadResult, promptsResult, selectionsResult]) => {
        
        if (!downloadResult.ok) {
          return downloadResult;
        }
        if (!promptsResult.ok) {
          return promptsResult;
        }
        if (!selectionsResult.ok) {
          return selectionsResult;
        }

        // Create a synthetic file object for redacted file
        const syntheticFile: FileType = {
          id: `${documentId}-redacted`,
          created_at: new Date().toISOString(),
          updated_at: null,
          file_hash: 'unknown',
          file_type: 'redacted',
          file_size: downloadResult.value.blob.size,
          mime_type: 'application/pdf',
          data: '',
          salt: null,
          document_id: documentId
        };

        const fileWithData: FileWithRelatedData = {
          file: syntheticFile,
          blob: downloadResult.value.blob,
          prompts: promptsResult.value,
          selections: selectionsResult.value
        };

        return { ok: true, value: fileWithData } as Result<FileWithRelatedData, unknown>;
      }))
      .tap(() => {
        toast.success(
          "Redacted file loaded successfully",
          { description: `Loaded redacted file for document` }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to load redacted file",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Fetch document prompts by document ID
   */
  async fetchDocumentPrompts(documentId: string): Promise<Result<PromptType[], unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get(`/documents/id/${documentId}/prompts`) as Promise<Result<PromptType[], unknown>>)
      .catch((error: unknown) => {
        toast.error(
          "Failed to fetch prompts",
          { description: "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Fetch document selections by document ID
   */
  async fetchDocumentSelections(documentId: string): Promise<Result<SelectionType[], unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get(`/documents/id/${documentId}/selections`) as Promise<Result<SelectionType[], unknown>>)
      .catch((error: unknown) => {
        toast.error(
          "Failed to fetch selections",
          { description: "Please try again." }
        );
        throw error;
      })
      .toResult();
  }
};
