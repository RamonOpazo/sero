import { ArrowLeft, KeyRound } from 'lucide-react';
import { useEditorView } from './use-editor-view';
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
    documentForViewer,
    passwordDialogState,
    actionHandlers,
    formatFileSize,
  } = useEditorView(fileType);

  const content = (() => {
    if (error) {
      return (
        <EmptyState
          message="Failed to load document"
          buttonText="Back to Documents"
          buttonIcon={<ArrowLeft />}
          onButtonClick={actionHandlers.onBackToDocuments}
        />
      );
    }

    if (isLoading) {
      return (
        <EmptyState
          variant="await"
          message="Loading document..."
        />
      );
    }

    if (!fileData) {
      return (
        <EmptyState
          message="File Not Loaded"
          buttonText="Unlock Project"
          buttonIcon={<KeyRound />}
          onButtonClick={actionHandlers.onRetryUnlock}
        />
      );
    }

    if (fileData && documentForViewer) {
      return (
        <DocumentViewer
          key={`${documentMetadata?.id}-${fileData?.file?.id}`}
          document={documentForViewer}
        />
      );
    }

    // Fallback: fileData present but viewer could not be initialized
    return (
      <EmptyState
        message={
          <>
            <p>{`File loaded successfully (${formatFileSize(fileData.blob.size)})`}</p>
            <p>{"Unable to initialize document viewer"}</p>
          </>
        }
      />
    );
  })();

  return (
    <>
      {content}
    </>
  );
}
