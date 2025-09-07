import { useNavigate, useParams } from 'react-router-dom';
import { DocumentsDataTable } from './documents-data-table';
import { UploadDocumentsDialog } from './dialogs/upload-documents-dialog';
import { EditDocumentDialog } from './dialogs/edit-document-dialog';
import { DeleteDocumentDialog } from './dialogs/delete-document-dialog';
import { useDocumentsView } from './use-documents-view';
import type { DocumentShallowType, DocumentType } from '@/types';

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Custom navigation handler for the data table
  const handleSelectDocument = (document: DocumentShallowType) => {
    navigate(`/projects/${projectId}/documents/${document.id}/original-file`);
  };

  // Lift business logic here
  const {
    documents,
    isLoading,
    error,
    dialogState,
    actionHandlers,
  } = useDocumentsView(handleSelectDocument);

  return (
    <>
      <DocumentsDataTable
        documents={documents}
        isLoading={isLoading}
        error={error}
        actionHandlers={actionHandlers as any}
      />

      {/* Document Upload Dialog */}
      <UploadDocumentsDialog
        isOpen={dialogState.upload.isOpen}
        onClose={dialogState.upload.onClose}
        onSubmit={dialogState.upload.onSubmit}
      />

      {/* Document Edit Dialog */}
      {dialogState.edit.document && (
        <EditDocumentDialog
          document={{
            ...dialogState.edit.document,
            files: [],
            prompts: [],
            selections: [],
            original_file: null,
            redacted_file: null,
          } as DocumentType}
          isOpen={dialogState.edit.isOpen}
          onClose={dialogState.edit.onClose}
          onSubmit={dialogState.edit.onSubmit}
        />
      )}

      {/* Document Deletion Dialog */}
      <DeleteDocumentDialog
        isOpen={dialogState.delete.isOpen}
        onClose={dialogState.delete.onClose}
        onConfirm={dialogState.delete.onConfirm}
        selectedDocument={dialogState.delete.selectedDocument}
      />
    </>
  );
}
