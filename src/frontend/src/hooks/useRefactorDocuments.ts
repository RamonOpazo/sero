import { useState, useCallback } from "react";
import { toast } from 'sonner'
import type { ApiResponse, DocumentShallowType, DocumentCreateType, DocumentUpdateType } from '@/types'
import { AsyncResultWrapper, type Result } from '@/lib/result'
import { api } from "@/lib/axios"

export function useRefactorDocuments() {
  const [documents, setDocuments] = useState<DocumentShallowType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const refreshDocuments = useCallback(async (skip = 0, limit = 100): Promise<Result<DocumentShallowType[], unknown>> => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    const queryString = params.toString();
    const url = `/documents/shallow${queryString ? `?${queryString}` : ''}`;

    return await AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<DocumentShallowType[], unknown>>)
      .tap((documentList) => setDocuments(documentList))
      .catch((error: unknown) => {
        setError(error);
        toast.error(
          "Failed to fetch documents",
          { description: "Please refresh the page to try again." }
        );
      })
      .finally(() => setLoading(false))
      .toResult();
  }, []);

  const refreshDocumentsForProject = useCallback(async (projectId: string, skip = 0, limit = 100): Promise<Result<DocumentShallowType[], unknown>> => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (skip > 0) params.append('skip', skip.toString());
    if (limit !== 100) params.append('limit', limit.toString());
    // Add project filter - this might need to be adjusted based on backend implementation
    params.append('project_id', projectId);
    const queryString = params.toString();
    const url = `/documents/search${queryString ? `?${queryString}` : ''}`;

    return await AsyncResultWrapper
      .from(api.safe.get(url) as Promise<Result<DocumentShallowType[], unknown>>)
      .tap((documentList) => setDocuments(documentList))
      .catch((error: unknown) => {
        setError(error);
        toast.error(
          "Failed to fetch documents",
          { description: "Please refresh the page to try again." }
        );
      })
      .finally(() => setLoading(false))
      .toResult();
  }, []);

  const createDocument = useCallback(async (documentData: DocumentCreateType): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .from(api.safe.post(`/documents`, documentData) as Promise<Result<DocumentShallowType, unknown>>)
      .andThen(() => refreshDocuments()) // Refresh the list after creating
      .tap(() => {
        toast.success(
          "Document created successfully",
          { description: `Created "${documentData.name}"` }
        )
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to create document",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
      })
      .void()
      .toResult();
  }, [refreshDocuments]);

  const updateDocument = useCallback(async (documentId: string, documentData: DocumentUpdateType): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .from(api.safe.put(`/documents/id/${documentId}`, {
        name: documentData.name?.trim(),
        description: documentData.description?.trim(),
        tags: documentData.tags,
      }) as Promise<Result<ApiResponse, unknown>>)
      .andThen(() => refreshDocuments())
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
      })
      .void()
      .toResult();
  }, [refreshDocuments]);

  const deleteDocuments = useCallback(async (documentsToDelete: DocumentShallowType[]): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .all(documentsToDelete.map(
        (d) => AsyncResultWrapper.from(api.safe.delete(`/documents/id/${d.id}`) as Promise<Result<ApiResponse, unknown>>)
      ))
      .andThen(() => refreshDocuments())
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
      })
      .void()
      .toResult();
  }, [refreshDocuments]);

  const clearDocuments = useCallback(() => {
    setDocuments([]);
    setError(null);
  }, []);

  return {
    documents,
    loading,
    error,
    refreshDocuments,
    refreshDocumentsForProject,
    createDocument,
    updateDocument,
    deleteDocuments,
    clearDocuments
  };
}
