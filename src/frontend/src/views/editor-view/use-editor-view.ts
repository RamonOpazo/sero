import { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWorkspace } from '@/providers/workspace-provider';
import { EditorAPI, type FileWithRelatedData } from '@/lib/editor-api';
import type { DocumentShallowType, MinimalDocumentType } from '@/types';
import { useProjectTrust } from '@/providers/project-trust-provider';

/**
 * Business logic hook for EditorView component
 * Handles document editor management, navigation, file operations, and state management for a specific document
 */
export function useEditorView(fileType: 'original' | 'redacted') {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();
  const { state, selectDocument } = useWorkspace();
  
  // Own editor state management
  const [documentMetadata, setDocumentMetadata] = useState<DocumentShallowType | null>(null);
  const [fileData, setFileData] = useState<FileWithRelatedData | null>(null);
  // Optionally prefetch the counterpart file (redacted) to enable toggle and immediate view switch
  const [prefetchedRedacted, setPrefetchedRedacted] = useState<FileWithRelatedData | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trust flow state
  const { ensureProjectTrust, clearProjectTrust } = useProjectTrust() as any;
  const [autoUnlockTried, setAutoUnlockTried] = useState(false);

  // Load document metadata for the current document
  const refreshDocumentMetadata = useCallback(async () => {
    if (!documentId) return;
    
    setIsLoadingMetadata(true);
    setError(null);
    
    const result = await EditorAPI.fetchDocumentMetadata(documentId, projectId);
    
    if (result.ok) {
      setDocumentMetadata(result.value);
      // Update workspace current document selection
      selectDocument(result.value);
    } else {
      setError(result.error instanceof Error ? result.error.message : 'Failed to load document metadata');
    }
    
    setIsLoadingMetadata(false);
  }, [documentId, projectId, selectDocument]);

  // Load document metadata when component mounts or documentId changes
  useEffect(() => {
    if (documentId) {
      refreshDocumentMetadata();
    }
  }, [documentId, refreshDocumentMetadata]);

  // Auto-unlock prompt: trigger trust flow once on first load for original file
  useEffect(() => {
    if (!autoUnlockTried && !fileData && documentId && projectId && fileType === 'original' && !isLoadingFile) {
      setAutoUnlockTried(true);
      void (async () => {
        await handleUnlockAndLoadOriginal();
      })();
    }
  }, [autoUnlockTried, fileData, documentId, projectId, fileType, isLoadingFile]);

  // Load file when it's redacted type and we have metadata
  useEffect(() => {
    if (fileType === 'redacted' && documentId && documentMetadata && !fileData && !isLoadingFile) {
      handleLoadRedactedFile();
    }
  }, [fileType, documentId, documentMetadata, fileData, isLoadingFile]);

  // Business logic handlers
  const handleBackToDocuments = useCallback(() => {
    navigate(`/projects/${projectId}/documents`);
  }, [navigate, projectId]);

  const handleLoadRedactedFile = useCallback(async () => {
    if (!documentId) return;

    setIsLoadingFile(true);
    setError(null);

    const result = await EditorAPI.loadRedactedFile(documentId);

    if (result.ok) {
      setFileData(result.value);
    } else {
      setError(result.error instanceof Error ? result.error.message : 'Failed to load redacted file');
    }

    setIsLoadingFile(false);
  }, [documentId]);

  const handleUnlockAndLoadOriginal = useCallback(async () => {
    if (!documentId || !projectId) return;

    setIsLoadingFile(true);
    setError(null);

    try {
      const { keyId, encryptedPassword } = await ensureProjectTrust(projectId);
      let result = await EditorAPI.loadOriginalFileEncrypted(documentId, { keyId, encryptedPassword });

      if (result.ok) {
        setFileData(result.value);
        toast.success('File loaded successfully!', {
          description: `Loaded ${fileType} file`,
        });

        // If the document is processed according to metadata, prefetch redacted now
        if (documentMetadata?.is_processed) {
          console.info('[EditorView] Redacted indicated by metadata; prefetching redacted blob…', {
            documentId,
            is_processed: documentMetadata?.is_processed,
          });
          EditorAPI.loadRedactedFile(documentId).then((r) => {
            if (r.ok) {
              console.info('[EditorView] Redacted prefetch OK', {
                fileId: r.value.file.id,
                size: r.value.blob.size,
                type: r.value.file.file_type,
              });
              setPrefetchedRedacted(r.value);
            } else {
              console.info('[EditorView] Redacted prefetch FAILED', r.error);
            }
          });
        }
      } else {
        // Possible expired ephemeral token; clear trust and retry once
        try {
          clearProjectTrust(projectId);
          const { keyId: keyId2, encryptedPassword: enc2 } = await ensureProjectTrust(projectId);
          result = await EditorAPI.loadOriginalFileEncrypted(documentId, { keyId: keyId2, encryptedPassword: enc2 });
          if (result.ok) {
            setFileData(result.value);
          } else {
            setError(result.error instanceof Error ? result.error.message : 'Failed to load original file');
          }
        } catch (e) {
          setError('Failed to load original file');
        }
      }
    } catch (error) {
      // User may have cancelled the trust dialog or an error occurred
      if (error instanceof Error && error.message === 'cancelled') {
        // Silent expected cancellation (no error log)
        toast.message('Project unlock cancelled');
      } else {
        console.error('Failed to unlock or load original file:', error);
        setError('Failed to load original file');
      }
    } finally {
      setIsLoadingFile(false);
    }
  }, [documentId, projectId, fileType, documentMetadata?.is_processed, ensureProjectTrust]);

  const handleRetryUnlock = useCallback(() => {
    void handleUnlockAndLoadOriginal();
  }, [handleUnlockAndLoadOriginal]);

  // Create a minimal document object compatible with DocumentViewer from loaded file data and metadata
  const documentForViewer = useMemo((): MinimalDocumentType | null => {
    if (!documentId || !fileData || !documentMetadata) {
      return null;
    }

    // Create stable arrays and objects to prevent reference changes
    // Attach the blob to the file(s) for the document viewer to use
    const primaryFileWithBlob = {
      ...fileData.file,
      blob: fileData.blob
    };

    const filesWithBlobs = [primaryFileWithBlob];

    if (prefetchedRedacted) {
      filesWithBlobs.push({ ...prefetchedRedacted.file, blob: prefetchedRedacted.blob });
    }

    console.info('[EditorView] Building viewer document', {
      documentId,
      metadataIsProcessed: documentMetadata?.is_processed,
      files: filesWithBlobs.map(f => ({ id: f.id, type: f.file_type, hasBlob: !!(f as any).blob })),
    });

    // Determine pointers for original and redacted files based on available files
    const originalPointer = filesWithBlobs.find(f => f.file_type === 'original') ?? null;
    const redactedPointer = filesWithBlobs.find(f => f.file_type === 'redacted') ?? null;

    // Create a minimal document object with real metadata instead of fallback data
    const viewerDocument: MinimalDocumentType = {
      id: documentMetadata.id,
      name: documentMetadata.name,
      description: documentMetadata.description,
      created_at: documentMetadata.created_at,
      updated_at: documentMetadata.updated_at,
      project_id: documentMetadata.project_id,
      files: filesWithBlobs as any,
      original_file: (originalPointer as any) || null,
      redacted_file: (redactedPointer as any) || null,
    };

    return viewerDocument;
  }, [
    // Document metadata dependencies
    documentMetadata?.id,
    documentMetadata?.name,
    documentMetadata?.description,
    documentMetadata?.created_at,
    documentMetadata?.updated_at,
    documentMetadata?.project_id,
    // Loaded file data dependencies
    fileData?.file?.id,
    fileData?.file?.file_hash,
    fileData?.file?.file_size,
    fileData?.file?.file_type,
    prefetchedRedacted?.file?.id,
    prefetchedRedacted?.blob,
  ]);


  // Action handlers
  const actionHandlers = useMemo(() => ({
    onBackToDocuments: handleBackToDocuments,
    onRetryUnlock: handleRetryUnlock,
  }), [
    handleBackToDocuments,
    handleRetryUnlock,
  ]);

  // Back-compat no-op password dialog state for legacy component shape
  const passwordDialogState = useMemo(() => ({
    isOpen: false,
    onClose: () => {},
    onConfirm: () => {},
    error: null as string | null,
    isLoading: false,
  }), []);

  // Utility function
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return {
    // State
    projectId,
    documentId,
    documentMetadata,
    fileData,
    currentDocument: state.currentDocument,
    isLoadingMetadata,
    isLoadingFile,
    isLoading: isLoadingMetadata || isLoadingFile,
    error,

    // Document viewer data
    documentForViewer,
    
    // Action handlers
    actionHandlers,

    // Legacy compatibility for EditorView shape
    passwordDialogState,
    
    // Utility functions
    formatFileSize,
    refreshDocumentMetadata,
  };
}
