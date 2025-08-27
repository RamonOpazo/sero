import { toast } from 'sonner';
import type { ApiResponse, DocumentShallowType, DocumentCreateType, DocumentUpdateType, DocumentType } from '@/types';
import { AsyncResultWrapper, type Result } from '@/lib/result';
import { api } from '@/lib/axios';
import { encryptPasswordSecurely, isWebCryptoSupported } from '@/lib/crypto';

/**
 * Documents API utility - centralized document CRUD operations
 * 
 * This module provides a clean API layer for document operations that can be used by:
 * - useDocuments hook (for state management)
 * - useDocumentsView hook (for direct operations)
 * - Any other components that need document API access
 */

function toShallow(doc: DocumentType): DocumentShallowType {
  const prompt_count = Array.isArray((doc as any).prompts) ? (doc as any).prompts.length : 0;
  const selection_count = Array.isArray((doc as any).selections) ? (doc as any).selections.length : 0;
  const is_processed = Boolean((doc as any).redacted_file);
  return {
    id: doc.id,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    name: doc.name,
    description: doc.description,
    project_id: doc.project_id,
    prompt_count,
    selection_count,
    is_processed,
    is_template: (doc as any).is_template ?? false,
  };
}

export const DocumentsAPI = {
  /**
   * Fetch all documents with optional pagination
   */
  async fetchDocuments(skip = 0, limit = 100): Promise<Result<DocumentShallowType[], unknown>> {
    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    const queryString = params.toString();
    const url = `/documents/shallow${queryString ? `?${queryString}` : ''}`;

    return await AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<DocumentShallowType[], unknown>>)
      .catch((error: unknown) => {
        toast.error(
          "Failed to fetch documents",
          { description: "Please refresh the page to try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Get a single shallow document by ID
   */
  async fetchDocumentShallow(documentId: string): Promise<Result<DocumentShallowType, unknown>> {
    return await AsyncResultWrapper
      .from(api.safe.get(`/documents/id/${documentId}/shallow`) as Promise<Result<DocumentShallowType, unknown>>)
      .catch((error: unknown) => {
        toast.error("Failed to fetch document", { description: "Please refresh and try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Get document summary by ID
   */
  async fetchDocumentSummary(documentId: string) {
    return await AsyncResultWrapper
      .from(api.safe.get(`/documents/id/${documentId}/summary`))
      .catch((error: unknown) => {
        toast.error("Failed to load summary", { description: "Please try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Get document tags by ID
   */
  async fetchDocumentTags(documentId: string): Promise<Result<string[], unknown>> {
    return await AsyncResultWrapper
      .from(api.safe.get(`/documents/id/${documentId}/tags`) as Promise<Result<string[], unknown>>)
      .catch((error: unknown) => {
        toast.error("Failed to load tags", { description: "Please try again." });
        throw error;
      })
      .toResult();
  },

  /**
   * Fetch documents for a specific project
   * Note: Backend does not support project filter on /documents/shallow.
   * We therefore use /documents/search (returns full Document[]) and map to shallow.
   */
  async fetchDocumentsForProject(projectId: string, skip = 0, limit = 100): Promise<Result<DocumentShallowType[], unknown>> {
    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    params.append('project_id', projectId);
    const queryString = params.toString();
    const url = `/documents/search${queryString ? `?${queryString}` : ''}`;

    return await AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<DocumentType[], unknown>>)
      .map((docs: DocumentType[]) => docs.map(toShallow))
      .catch((error: unknown) => {
        toast.error(
          "Failed to fetch documents",
          { description: "Please refresh the page to try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Create a new document
   */
  async createDocument(documentData: DocumentCreateType): Promise<Result<DocumentShallowType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.post(`/documents`, documentData) as Promise<Result<DocumentType, unknown>>)
      .map((doc: DocumentType) => toShallow(doc))
      .tap(() => {
        toast.success(
          "Document created successfully",
          { description: `Created \"${documentData.name}\"` }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to create document",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Update an existing document
   */
  async updateDocument(documentId: string, documentData: DocumentUpdateType): Promise<Result<DocumentShallowType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/documents/id/${documentId}`, {
        name: documentData.name?.trim(),
        description: documentData.description?.trim(),
      }) as Promise<Result<DocumentType, unknown>>)
      .map((doc: DocumentType) => toShallow(doc))
      .tap(() => {
        toast.success(
          "Document updated successfully",
          { description: `Updated \"${documentData.name || 'document'}\"` }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to update document",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Delete multiple documents
   */
  async deleteDocuments(documentsToDelete: DocumentShallowType[]): Promise<Result<ApiResponse[], unknown>> {
    return AsyncResultWrapper
      .all(documentsToDelete.map(
        (d) => AsyncResultWrapper.from(api.safe.delete(`/documents/id/${d.id}`) as Promise<Result<ApiResponse, unknown>>)
      ))
      .tap(() => {
        const documentCount = documentsToDelete.length;
        const documentNames = documentsToDelete.map(d => d.name).join(', ');
        toast.success(
          `Successfully deleted ${documentCount} document${documentCount !== 1 ? "s" : ""}`,
          { 
            description: documentCount === 1 
              ? `Deleted "${documentNames}"` 
              : `Deleted ${documentCount} documents` 
          }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to delete documents",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Delete a single document
   */
  async deleteDocument(document: DocumentShallowType): Promise<Result<ApiResponse, unknown>> {
    const result = await this.deleteDocuments([document]);
    
    if (result.ok) {
      return { ok: true, value: result.value[0] };
    } else {
      return { ok: false, error: result.error };
    }
  },


  /**
   * Upload documents in bulk with encrypted password (preferred)
   */
  async uploadDocumentsEncrypted(
    uploadData: { project_id: string; files: FileList; template_description?: string },
    creds: { keyId: string; encryptedPassword: string },
  ): Promise<Result<ApiResponse, unknown>> {
    const formData = new FormData();
    formData.append('project_id', uploadData.project_id);
    formData.append('key_id', creds.keyId);
    formData.append('encrypted_password', creds.encryptedPassword);
    if (uploadData.template_description) {
      formData.append('template_description', uploadData.template_description);
    }
    for (let i = 0; i < uploadData.files.length; i++) {
      formData.append('files', uploadData.files[i]);
    }

    return AsyncResultWrapper
      .from(api.safe.post(`/documents/bulk-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }) as Promise<Result<ApiResponse, unknown>>)
      .tap((resp) => {
        toast.success(
          'Successfully uploaded documents',
          { description: resp?.message ?? 'Upload complete' } as any,
        );
      })
      .catch((error: unknown) => {
        toast.error(
          'Failed to upload documents',
          { description: error instanceof Error ? error.message : 'Please try again.' },
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Process an original document to produce a redacted file
   * Uses encrypted password as required by backend.
   */
  async processDocument(documentId: string, password: string): Promise<Result<ApiResponse, unknown>> {
    if (!isWebCryptoSupported()) {
      const error = new Error('Web Crypto API not supported in this browser');
      return { ok: false, error };
    }

    return AsyncResultWrapper
      .from((async () => {
        const encrypted = await encryptPasswordSecurely(password);
        return api.safe.post(`/documents/id/${documentId}/process`, {
          key_id: encrypted.keyId,
          encrypted_password: encrypted.encryptedPassword,
        }) as Promise<Result<ApiResponse, unknown>>;
      })())
      .tap(() => {
        toast.success(
          "Processing started",
          { description: "Your document is being processed. This may take a moment." }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to process document",
          { description: error instanceof Error ? error.message : "Please check your password and try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Set this document as the project-scoped document (template)
   */
  async setDocumentAsProjectTemplate(documentId: string): Promise<Result<ApiResponse, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/documents/id/${documentId}/template`) as Promise<Result<ApiResponse, unknown>>)
      .tap(() => {
        toast.success(
          'Document scoped to project',
          { description: 'This document is now the project-scoped template.' },
        );
      })
      .catch((error: unknown) => {
        toast.error(
          'Failed to scope document to project',
          { description: error instanceof Error ? error.message : 'Please try again.' },
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Process an original document using already-encrypted credentials
   */
  async processDocumentEncrypted(
    documentId: string,
    creds: { keyId: string; encryptedPassword: string },
  ): Promise<Result<ApiResponse, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.post(`/documents/id/${documentId}/process`, {
        key_id: creds.keyId,
        encrypted_password: creds.encryptedPassword,
      }) as Promise<Result<ApiResponse, unknown>>)
      .tap(() => {
        toast.success(
          'Processing started',
          { description: 'Your document is being processed. This may take a moment.' },
        );
      })
      .catch((error: unknown) => {
        toast.error(
          'Failed to process document',
          { description: error instanceof Error ? error.message : 'Please try again.' },
        );
        throw error;
      })
      .toResult();
  },
};
