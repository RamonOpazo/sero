import { toast } from 'sonner';
import type { ApiResponse, DocumentShallowType, DocumentCreateType, DocumentUpdateType, DocumentBulkUploadRequestType } from '@/types';
import { AsyncResultWrapper, type Result } from '@/lib/result';
import { api } from '@/lib/axios';

/**
 * Documents API utility - centralized document CRUD operations
 * 
 * This module provides a clean API layer for document operations that can be used by:
 * - useDocuments hook (for state management)
 * - useDocumentsView hook (for direct operations)
 * - Any other components that need document API access
 */

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
   * Fetch documents for a specific project
   */
  async fetchDocumentsForProject(projectId: string, skip = 0, limit = 100): Promise<Result<DocumentShallowType[], unknown>> {
    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    params.append('project_id', projectId);
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
   * Create a new document
   */
  async createDocument(documentData: DocumentCreateType): Promise<Result<DocumentShallowType, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.post(`/documents`, documentData) as Promise<Result<DocumentShallowType, unknown>>)
      .tap(() => {
        toast.success(
          "Document created successfully",
          { description: `Created "${documentData.name}"` }
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
  async updateDocument(documentId: string, documentData: DocumentUpdateType): Promise<Result<ApiResponse, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.put(`/documents/id/${documentId}`, {
        name: documentData.name?.trim(),
        description: documentData.description?.trim(),
        tags: documentData.tags,
      }) as Promise<Result<ApiResponse, unknown>>)
      .tap(() => {
        toast.success(
          "Document updated successfully",
          { description: `Updated "${documentData.name || 'document'}"` }
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
   * Upload documents in bulk
   */
  async uploadDocuments(uploadData: DocumentBulkUploadRequestType): Promise<Result<DocumentShallowType[], unknown>> {
    const formData = new FormData();
    formData.append('project_id', uploadData.project_id);
    formData.append('password', uploadData.password);
    
    if (uploadData.template_description) {
      formData.append('template_description', uploadData.template_description);
    }
    
    // Add all files to the form data
    for (let i = 0; i < uploadData.files.length; i++) {
      formData.append('files', uploadData.files[i]);
    }

    return AsyncResultWrapper
      .from(api.safe.post(`/documents/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }) as Promise<Result<DocumentShallowType[], unknown>>)
      .tap((documents) => {
        const documentCount = documents.length;
        toast.success(
          `Successfully uploaded ${documentCount} document${documentCount !== 1 ? "s" : ""}`,
          { 
            description: documentCount === 1 
              ? `Uploaded "${documents[0].name}"` 
              : `Uploaded ${documentCount} documents` 
          }
        );
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to upload documents",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
        throw error;
      })
      .toResult();
  },

  /**
   * Process an original document to produce a redacted file
   */
  async processDocument(documentId: string, password: string): Promise<Result<ApiResponse, unknown>> {
    const form = new FormData();
    form.append('password', password);

    return AsyncResultWrapper
      .from(api.safe.post(`/documents/id/${documentId}/process`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }) as Promise<Result<ApiResponse, unknown>>)
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
  }
};
