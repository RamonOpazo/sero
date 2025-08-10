import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Plus, Eye, Download } from 'lucide-react'
import { DataTable, Column, Actions } from '@/components/features/data-table'
import { EmptyState } from '@/components/shared/EmptyState'
import { PasswordDialog } from '@/components/dialogs/PasswordDialog'
import { CreateDocumentDialog } from '@/components/dialogs/CreateDocumentDialog'
import { EditDocumentDialog } from '@/components/dialogs/EditDocumentDialog'
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog'
import { usePasswordProtectedFile } from '@/hooks/usePasswordProtectedFile'
import type { DocumentType, DocumentBulkUploadRequestType, DocumentUpdateType } from '@/types'
import {
  WidgetContainer,
  Widget,
  WidgetDescription,
  WidgetHeader,
  WidgetTitle,
} from "@/components/shared/Widget"
import { getRandomEasterEgg } from '@/utils/content'
import { useDocuments } from './useDocument'

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>()
  const { documents, setProjectId, createDocuments, deleteSelectedDocuments, editSelectedDocument } = useDocuments()
  const { isPasswordDialogOpen, passwordError, isValidatingPassword, downloadFile, handlePasswordConfirm, handlePasswordCancel } = usePasswordProtectedFile(projectId)
  const location = useLocation();
  // Try to get project info from state, but don't require it (for direct URL access)
  const { projectName, projectDescription } = location.state || {};
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentType[]>([])
  const [documentToEdit, setDocumentToEdit] = useState<DocumentType | null>(null)
  const [documentsToDelete, setDocumentsToDelete] = useState<DocumentType[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectId) {
      setProjectId(projectId)
    }
  }, [projectId, setProjectId])

  const handleSelectionChange = useCallback((selectedRows: DocumentType[]) => {
    setSelectedDocuments(selectedRows)
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedDocuments.length > 0) {
      setDocumentsToDelete(selectedDocuments)
    }
  }, [selectedDocuments])

  const handleConfirmDelete = useCallback(async () => {
    await deleteSelectedDocuments(documentsToDelete)
    setSelectedDocuments(current => current.filter(d => !documentsToDelete.includes(d)))
    setDocumentsToDelete([])
  }, [documentsToDelete, deleteSelectedDocuments])

  const handleCreateDocuments = async (uploadData: DocumentBulkUploadRequestType) => {
    await createDocuments(uploadData)
  }

  const handleDeleteSingleDocument = useCallback((document: DocumentType) => {
    setDocumentsToDelete([document])
  }, [])

  const handleEditDocument = useCallback((document: DocumentType) => {
    setDocumentToEdit(document)
  }, [])

  const handleEditDocumentSubmit = useCallback(async (documentData: DocumentUpdateType) => {
    if (documentToEdit) {
      await editSelectedDocument(documentToEdit, documentData)
    }
  }, [documentToEdit, editSelectedDocument])

  const columns = useMemo(() => [
    Column.text<DocumentType>('name').truncate(25).sortable().build(),
    Column.text<DocumentType>('description').header('Description').truncate(25).build(),
    Column.date<DocumentType>('created_at').sortable('Created').build(),
    Column.date<DocumentType>('updated_at').sortable('Updated').build(),
    Actions.create<DocumentType>()
      .copy(
        (document) => document.id,
        'Copy document ID',
        (id) => ({ title: 'Document ID copied to clipboard', description: `ID: ${id}` })
      )
      .separator()
      .custom({ label: 'View Original File', icon: Eye, onClick: (document) => navigate(
        `/projects/${projectId}/documents/${document.id}/original-file`
      ) })
      .custom({ label: 'Download File', icon: Download, onClick: (document) => downloadFile(document) })
      .edit(handleEditDocument, 'Edit document')
      .delete(handleDeleteSingleDocument, 'Delete document')
      .build()
  ], [downloadFile, handleEditDocument, handleDeleteSingleDocument])

  const isSingleDocumentDelete = documentsToDelete.length === 1;

  return (
    <WidgetContainer expanded>
      <Widget>
        <WidgetHeader>
          <WidgetTitle>{projectName || 'Loading...'}</WidgetTitle>
          <WidgetDescription>
            {projectDescription ? projectDescription : getRandomEasterEgg()}
          </WidgetDescription>
        </WidgetHeader>
      </Widget>

      {documents.length > 0 ? (
        <DataTable
          columns={columns}
          data={documents}
          selection={selectedDocuments}
          searchKey="name"
          searchPlaceholder="Search documents..."
          onRowSelectionChange={handleSelectionChange}
          onDeleteSelection={handleDeleteSelected}
          onCreateEntries={() => setIsCreateDialogOpen(true)}
          pageSize={10}
        />
      ) : (
        <EmptyState
          message="No documents found"
          buttonText="Upload your first document"
          buttonIcon={<Plus className="h-4 w-4" />}
          onButtonClick={() => setIsCreateDialogOpen(true)}
        />
      )}

      <CreateDocumentDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateDocuments}
        projectId={projectId || ''}
      />

      <EditDocumentDialog
        isOpen={!!documentToEdit}
        onClose={() => setDocumentToEdit(null)}
        onSubmit={handleEditDocumentSubmit}
        document={documentToEdit}
      />

      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
        error={passwordError}
        isLoading={isValidatingPassword}
      />

      <ConfirmationDialog
        isOpen={documentsToDelete.length > 0}
        onClose={() => setDocumentsToDelete([])}
        onConfirm={handleConfirmDelete}
        title={isSingleDocumentDelete ? "Delete Document" : `Delete ${documentsToDelete.length} Documents`}
        description={
          isSingleDocumentDelete
            ? `You are about to permanently delete the document "${documentsToDelete[0]?.name}". This action cannot be undone.`
            : `You are about to permanently delete ${documentsToDelete.length} documents. This action cannot be undone.`
        }
        confirmationText="delete"
        confirmButtonText="Delete Forever"
        variant="destructive"
      />
    </WidgetContainer>
  )
}
