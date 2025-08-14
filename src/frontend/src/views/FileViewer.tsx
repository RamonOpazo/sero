import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordDialog } from '@/components/dialogs/PasswordDialog';
import DocumentViewer from '@/components/features/document-viewer/DocumentViewer';
import { useFiles } from '@/hooks/useFiles';
import type { DocumentType } from '@/types';

interface FileViewerProps {
  fileType: 'original' | 'redacted';
}

export function FileViewer({ fileType }: FileViewerProps) {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const navigate = useNavigate();

  // No need to fetch document - we have the ID from URL params
  const [error] = useState<string | null>(null);

  // Password dialog state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);
  const [userCancelledPassword, setUserCancelledPassword] = useState(false);

  // Use files hook for file loading with new document-based methods
  const { loadOriginalFileByDocumentId, loadRedactedFileByDocumentId, currentFileData, error: fileError } = useFiles();

  // Auto-prompt for password on mount if we haven't cancelled and no file is loaded
  useEffect(() => {
    if (!userCancelledPassword && !currentFileData && documentId) {
      setIsPasswordDialogOpen(true);
    }
  }, [documentId, userCancelledPassword, currentFileData]);

  const handleBackToDocuments = () => {
    navigate(`/projects/${projectId}/documents`);
  };

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

  const handlePasswordCancel = useCallback(() => {
    setIsPasswordDialogOpen(false);
    setPasswordError(null);
    setUserCancelledPassword(true);
  }, []);

  const handleRetryPassword = useCallback(() => {
    if (!userCancelledPassword) return;
    setIsPasswordDialogOpen(true);
    setPasswordError(null);
    setUserCancelledPassword(false);
  }, [userCancelledPassword]);

  // Create a document object compatible with DocumentViewer from loaded file data
  const documentForViewer = useMemo((): DocumentType | null => {
    if (!documentId || !currentFileData) {
      return null;
    }

    // Create stable arrays and objects to prevent reference changes
    // Attach the blob to the file for the document viewer to use
    const fileWithBlob = {
      ...currentFileData.file,
      blob: currentFileData.blob
    };
    const stableFiles = [fileWithBlob];
    const stablePrompts = currentFileData.prompts || [];
    const stableSelections = currentFileData.selections || [];

    // Since DocumentShallowType doesn't have files array, we determine
    // original/redacted files based on the current loaded file and shallow metadata
    const isCurrentFileOriginal = currentFileData.file.file_type === 'original';
    const originalFile = isCurrentFileOriginal ? fileWithBlob : null;
    const redactedFile = !isCurrentFileOriginal ? fileWithBlob : null;

    // Create a stable object to avoid unnecessary re-renders
    // Use synthetic document data since we don't fetch the document
    const viewerDocument: DocumentType = {
      id: documentId,
      name: `Document ${documentId.slice(-8)}`, // Use last 8 chars of ID as fallback name
      description: '',
      created_at: new Date().toISOString(), // Fallback timestamp
      updated_at: null,
      project_id: projectId || '', // Use from URL params
      tags: [],
      files: stableFiles,
      original_file: originalFile,
      redacted_file: redactedFile,
      prompts: stablePrompts,
      selections: stableSelections
    };

    return viewerDocument;
  }, [
    // Document ID dependencies
    documentId,
    projectId,
    // Loaded file data dependencies
    currentFileData?.file?.id,
    currentFileData?.file?.file_hash,
    currentFileData?.file?.file_size,
    currentFileData?.file?.file_type,
    currentFileData?.prompts?.length,
    currentFileData?.selections?.length,
  ]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load file</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            onClick={handleBackToDocuments}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* File Content */}
      {!currentFileData && !userCancelledPassword && (
        <div className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-16 text-center">
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground mb-4">
                File Encrypted
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                This document requires a password to decrypt the {fileType} file
              </p>
              <Button
                onClick={() => setIsPasswordDialogOpen(true)}
                className="px-6 py-2"
              >
                Enter Password
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!currentFileData && userCancelledPassword && (
        <div className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-16 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground mb-4">
                File Not Loaded
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                You cancelled the password entry. Click below to try again.
              </p>
              <Button
                onClick={handleRetryPassword}
                variant="outline"
                className="px-6 py-2"
              >
                Retry Password
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {currentFileData && documentForViewer && (
        <div className="flex-1 min-h-0">
          <DocumentViewer
            key={`${documentId}-${currentFileData?.file?.id}`}
            document={documentForViewer}
          />
        </div>
      )}

      {currentFileData && !documentForViewer && (
        <div className="flex-1 flex items-center justify-center bg-muted/10 rounded-lg">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">PDF Preview</p>
            <p className="text-sm text-muted-foreground">
              File loaded successfully ({formatFileSize(currentFileData.blob.size)})
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Unable to initialize document viewer
            </p>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
        error={passwordError}
        isLoading={isValidatingPassword}
      />
    </div>
  );
}
