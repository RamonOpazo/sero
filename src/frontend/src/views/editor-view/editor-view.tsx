import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, Lock, KeyRound } from 'lucide-react';
import { useEditorView } from './use-editor-view';
import { DocumentPasswordDialog } from './dialogs';
import DocumentViewer from '@/components/features/document-viewer';
import { EmptyState } from '@/components';

interface EditorViewProps {
  fileType: 'original' | 'redacted';
}

export function EditorView({ fileType }: EditorViewProps) {
  const {
    documentMetadata,
    fileData,
    isLoading,
    error,
    userCancelledPassword,
    documentForViewer,
    passwordDialogState,
    actionHandlers,
    formatFileSize,
  } = useEditorView(fileType);

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load document</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            onClick={actionHandlers.onBackToDocuments}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground mb-2">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* File Content */}
      {!fileData && (
        <EmptyState
          message='File Not Loaded'
          buttonText='Retry Password'
          buttonIcon={<KeyRound />}
          onButtonClick={actionHandlers.onRetryPassword}
        />
      )}

      {fileData && documentForViewer && (
        <div className="flex-1 min-h-0">
          <DocumentViewer
            key={`${documentMetadata?.id}-${fileData?.file?.id}`}
            document={documentForViewer}
          />
        </div>
      )}

      {fileData && !documentForViewer && (
        <div className="flex-1 flex items-center justify-center bg-muted/10 rounded-lg">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">PDF Preview</p>
            <p className="text-sm text-muted-foreground">
              File loaded successfully ({formatFileSize(fileData.blob.size)})
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Unable to initialize document viewer
            </p>
          </div>
        </div>
      )}

      {/* Password Dialog */}
      <DocumentPasswordDialog
        isOpen={passwordDialogState.isOpen}
        onClose={passwordDialogState.onClose}
        onConfirm={passwordDialogState.onConfirm}
        error={passwordDialogState.error}
        isLoading={passwordDialogState.isLoading}
      />
    </div>
  );
}
