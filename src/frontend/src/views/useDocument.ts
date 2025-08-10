import { useState, useEffect, useCallback } from "react";
import { toast } from 'sonner'
import type { ApiResponse, DocumentType, DocumentBulkUploadRequestType, DocumentUpdateType } from '@/types'
import { AsyncResultWrapper, type Result, err } from '@/lib/result'
import { api } from "@/lib/axios"

export function useDocuments() {
  const [ projectId, setProjectId ] = useState<string>();
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    refreshDocuments();
  }, [projectId]);

  const refreshDocuments = useCallback(async (): Promise<Result<DocumentType[], unknown>> => {
    if (!projectId) {
      setDocuments([]);
      return err(new Error("No project ID provided"));
    }
    
    setLoading(true);
    setError(null);

    return await AsyncResultWrapper
      .from(api.safe.get(`/documents/search?project_id=${projectId}`) as Promise<Result<DocumentType[], unknown>>)
      .tap((documents) => setDocuments(documents))
      .catch((_: unknown) => {
        toast.error(
          "Failed to fetch documents:",
          { description: "Please refresh the page to try again." });
      })
      .finally(() => setLoading(false))
      .toResult();
    ;
  }, [projectId]);

  const createDocuments = useCallback(async (documentData: DocumentBulkUploadRequestType): Promise<Result<void, unknown>> => {
    const formData = buildDocumentUploadForm(documentData);
    return AsyncResultWrapper
      .from(api.safe.post(`/documents/bulk-upload`, formData) as Promise<Result<DocumentType, unknown>>)
      .andThen(refreshDocuments)
      .tap(() => {
        const fileCount = documentData.files.length
        toast.success(
          `Successfully uploaded ${fileCount} document${fileCount !== 1 ? 's' : ''}`,
          {
            description: fileCount === 1
              ? `Uploaded "${documentData.files[0].name}"`
              : `Uploaded ${fileCount} documents`
          }
        )
      })
      .catch((error: unknown) => {
        toast.error(
          "Failed to upload documents",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
      })
      .void()
      .toResult();
  }, [refreshDocuments]);

  const deleteSelectedDocuments = useCallback(async (documentsToDelete: DocumentType[]): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .all(documentsToDelete.map(
        (d) => AsyncResultWrapper.from(api.safe.delete(`/documents/id/${d.id}`) as Promise<Result<ApiResponse, unknown>>)))
      .andThen(refreshDocuments)
      .tap(() => {
        const documentCount = documentsToDelete.length
        const documentNames = documentsToDelete.map(d => d.name).join(', ')
        toast.success(
          `Successfully deleted ${documentCount} document${documentCount !== 1 ? "s" : ""}`,
          { description: documentCount === 1 ? `Deleted "${documentNames}"` : `Deleted ${documentCount} documents`, }
        );
      })
      .catch((error) => {
        toast.error(
          "Failed to delete documents",
          { description: error instanceof Error ? error.message : "Please try again.", }
        );
      })
      .void()
      .toResult();
  }, [refreshDocuments])

  const editSelectedDocument = useCallback(async (documentToEdit: DocumentType, documentData: DocumentUpdateType): Promise<Result<void, unknown>> => {
    return AsyncResultWrapper
      .from(api.safe.put(`/documents/id/${documentToEdit.id}`, {
        description: documentData.description?.trim(),
      }) as Promise<Result<ApiResponse, unknown>>)
      .andThen(refreshDocuments)
      .tap(() => {
        toast.success(
          "Document updated successfully",
          { description: `Updated "${documentToEdit.name}"` },
        );
      })
      .catch((error) => {
        toast.error(
          "Failed to update document",
          { description: error instanceof Error ? error.message : "Please try again.", });
      })
      .void()
      .toResult();
  }, [refreshDocuments]);

  return {
    projectId,
    documents,
    loading,
    error,
    setProjectId,
    refreshDocuments,
    createDocuments,
    deleteSelectedDocuments,
    editSelectedDocument
  };
}

function buildDocumentUploadForm(data: DocumentBulkUploadRequestType): FormData {
  const formData = new FormData();
  formData.append("project_id", data.project_id);
  formData.append("password", data.password);
  data.template_description && formData.append("template_description", data.template_description);

  for (const file of Array.from(data.files)) {
    formData.append("files", file as Blob);
  }

  return formData;
}
