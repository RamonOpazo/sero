import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFiles } from '@/hooks/useFiles';
import { api } from '@/lib/axios';
import type { MinimalDocumentType, DocumentShallowType } from '@/types';

interface UseDocumentEditorProps {
  fileType: 'original' | 'redacted';
}

/**
 * Business logic hook for DocumentEditor component
 * Handles document metadata loading, password validation, file loading, and document state management
 */
export function useDocumentEditor({ fileType }: UseDocumentEditorProps) {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();

  // Document metadata state
  const [documentMetadata, setDocumentMetadata] = useState<DocumentShallowType | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password dialog state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);
  const [userCancelledPassword, setUserCancelledPassword] = useState(false);

  // Use files hook for file loading with new document-based methods
  const { loadOriginalFileByDocumentId, loadRedactedFileByDocumentId, currentFileData, error: fileError } = useFiles();

  // Fetch document metadata on mount
  useEffect(() => {
    const fetchDocumentMetadata = async () => {
      if (!documentId) return;
      
      setMetadataLoading(true);
      setError(null);
      
      try {
        // Use search endpoint to get shallow document data - search by project_id should return our document
        const params = new URLSearchParams();
        if (projectId) params.append('project_id', projectId);
        const queryString = params.toString();
        const url = `/documents/search${queryString ? `?${queryString}` : ''}`;
        
        const result = await api.safe.get(url);
        
        if (result.ok) {
          // Find our specific document in the results
          const documents = result.value as DocumentShallowType[];
          const targetDocument = documents.find(doc => doc.id === documentId);
          
          if (targetDocument) {
            setDocumentMetadata(targetDocument);
          } else {
            setError('Document not found in project');
          }
        } else {
          const errorMessage = (result.error as any)?.response?.data?.detail || 'Failed to fetch document metadata';
          setError(errorMessage);
        }
      } catch (error) {
        console.error('Error fetching document metadata:', error);
        setError('Failed to fetch document metadata');
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchDocumentMetadata();
  }, [documentId, projectId]);

  // Auto-prompt for password on mount if we haven't cancelled and no file is loaded
  useEffect(() => {
    if (!userCancelledPassword && !currentFileData && documentId) {
      setIsPasswordDialogOpen(true);
    }
  }, [documentId, userCancelledPassword, currentFileData]);

  // Navigation handler to go back to documents list
  const handleBackToDocuments = useCallback(() => {
    navigate(`/projects/${projectId}/documents`);
  }, [navigate, projectId]);

  // Handle password confirmation and file loading
  const handlePasswordConfirm = useCallback(async (password: string) => {
    if (!documentId) return;

    setIsValidatingPassword(true);
    setPasswordError(null);

    try {
      // Use new document-based download methods - they will handle file existence validation
      if (fileType === 'original') {
        await loadOriginalFileByDocumentId(documentId, password);
      } else {
        await loadRedactedFileByDocumentId(documentId);
      }

      if (!fileError) {
        // Success - close dialog
        setIsPasswordDialogOpen(false);
        setPasswordError(null);

        toast.success('File loaded successfully!', {
          description: `Loaded ${fileType} file`
        });
      } else {
        setPasswordError('Failed to load file. Please check your password and try again.');
      }
    } catch (error) {
      console.error('Password validation error:', error);
      setPasswordError('Failed to load file. Please check your password and try again.');
    } finally {
      setIsValidatingPassword(false);
    }
  }, [documentId, fileType, loadOriginalFileByDocumentId, loadRedactedFileByDocumentId, fileError]);

  // Handle password dialog cancellation
  const handlePasswordCancel = useCallback(() => {
    setIsPasswordDialogOpen(false);
    setPasswordError(null);
    setUserCancelledPassword(true);
  }, []);

  // Handle retry password after cancellation
  const handleRetryPassword = useCallback(() => {
    if (!userCancelledPassword) return;
    setIsPasswordDialogOpen(true);
    setPasswordError(null);
    setUserCancelledPassword(false);
  }, [userCancelledPassword]);

  // Create a minimal document object compatible with DocumentViewer from loaded file data and metadata
  const documentForViewer = useMemo((): MinimalDocumentType | null => {
    if (!documentId || !currentFileData || !documentMetadata) {
      return null;
    }

    // Create stable arrays and objects to prevent reference changes
    // Attach the blob to the file for the document viewer to use
    const fileWithBlob = {
      ...currentFileData.file,
      blob: currentFileData.blob
    };
    const stableFiles = [fileWithBlob];

    // Since DocumentShallowType doesn't have files array, we determine
    // original/redacted files based on the current loaded file and shallow metadata
    const isCurrentFileOriginal = currentFileData.file.file_type === 'original';
    const originalFile = isCurrentFileOriginal ? fileWithBlob : null;
    const redactedFile = !isCurrentFileOriginal ? fileWithBlob : null;

    // Create a minimal document object with real metadata instead of fallback data
    const viewerDocument: MinimalDocumentType = {
      id: documentMetadata.id,
      name: documentMetadata.name,
      description: documentMetadata.description,
      created_at: documentMetadata.created_at,
      updated_at: documentMetadata.updated_at,
      project_id: documentMetadata.project_id,
      tags: documentMetadata.tags,
      files: stableFiles,
      original_file: originalFile,
      redacted_file: redactedFile,
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
    documentMetadata?.tags,
    // Loaded file data dependencies
    currentFileData?.file?.id,
    currentFileData?.file?.file_hash,
    currentFileData?.file?.file_size,
    currentFileData?.file?.file_type,
  ]);

  // Utility function for formatting file sizes
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    // State
    projectId,
    documentId,
    documentMetadata,
    metadataLoading,
    error,
    currentFileData,
    documentForViewer,
    
    // Password dialog state
    isPasswordDialogOpen,
    passwordError,
    isValidatingPassword,
    userCancelledPassword,
    
    // Actions
    handleBackToDocuments,
    handlePasswordConfirm,
    handlePasswordCancel,
    handleRetryPassword,
    setIsPasswordDialogOpen,
    
    // Utilities
    formatFileSize,
  };
}
