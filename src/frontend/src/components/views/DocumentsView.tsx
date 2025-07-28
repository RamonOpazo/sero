import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
// import { Trash2, Plus, Eye, Download } from 'lucide-react'
import { Plus, Eye, Download } from 'lucide-react'
import { toast } from 'sonner'
// import { Button } from '@/components/ui/button'
import { DataTable, Column, Actions } from '@/components/features/data-table'
import { EmptyState } from '@/components/atomic/EmptyState'
import { PasswordDialog } from '@/components/dialogs/PasswordDialog'
import { CreateDocumentDialog } from '@/components/dialogs/CreateDocumentDialog'
import { EditDocumentDialog } from '@/components/dialogs/EditDocumentDialog'
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog'
import { usePasswordProtectedFile } from '@/hooks/usePasswordProtectedFile'
import type { Document, Project, DocumentBulkUploadRequest } from '@/types'
import {
  Widget,
  // WidgetContent,
  WidgetDescription,
  WidgetHeader,
  WidgetTitle,
} from "@/components/atomic/Widget"
import { getRandomEasterEgg } from '@/utils/content'

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)

  // Use password-protected file hook
  const {
    isPasswordDialogOpen,
    passwordError,
    isValidatingPassword,
    viewFile,
    downloadFile,
    handlePasswordConfirm,
    handlePasswordCancel
  } = usePasswordProtectedFile(projectId)

  useEffect(() => {
    if (!projectId) return

    // Fetch project details
    fetch(`/api/projects/id/${projectId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        console.log('Project loaded:', data.name)
        setProject(data)
      })
      .catch(err => {
        console.error('Error fetching project:', err)
        toast.error('Failed to load project details', {
          description: 'Please refresh the page to try again.'
        })
      })

    // Fetch documents for this project
    fetch(`/api/documents/search?project_id=${projectId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        console.log('Documents loaded:', data.length, 'documents')
        setDocuments(data)
      })
      .catch(err => {
        console.error('Error fetching documents:', err)
        toast.error('Failed to load documents', {
          description: 'Please refresh the page to try again.'
        })
      })
  }, [projectId])

  const handleSelectionChange = useCallback((selectedRows: Document[]) => {
    setSelectedDocuments(selectedRows)
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedDocuments.length === 0) return
    setIsDeleteDialogOpen(true)
  }, [selectedDocuments])

  const handleCreateDocuments = useCallback(async (uploadData: DocumentBulkUploadRequest) => {
    try {
      const formData = new FormData()

      // Add project_id
      formData.append('project_id', uploadData.project_id)

      // Add all files to the form data
      Array.from(uploadData.files as FileList).forEach(file => {
        formData.append('files', file)
      })

      // Add other fields
      formData.append('password', uploadData.password)
      if (uploadData.template_description) {
        formData.append('template_description', uploadData.template_description)
      }

      const response = await fetch(`/api/documents/bulk-upload`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        // Refresh the documents list
        const documentsResponse = await fetch(`/api/documents/search?project_id=${projectId}`)
        if (documentsResponse.ok) {
          const data = await documentsResponse.json()
          setDocuments(data)

          const fileCount = uploadData.files.length
          toast.success(`Successfully uploaded ${fileCount} document${fileCount !== 1 ? 's' : ''}`, {
            description: fileCount === 1 ?
              `Uploaded "${uploadData.files[0].name}"` :
              `Uploaded ${fileCount} documents`
          })
        } else {
          throw new Error('Failed to refresh document list after upload')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to upload documents (${response.status})`)
      }
    } catch (error) {
      console.error('Error uploading documents:', error)
      toast.error('Failed to upload documents', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Re-throw to let the dialog handle the error display
    }
  }, [projectId])

  const handleEditDocument = useCallback((document: Document) => {
    setDocumentToEdit(document)
    setIsEditDialogOpen(true)
  }, [])

  const handleEditSubmit = useCallback(async (documentData: { description?: string }) => {
    if (!documentToEdit) return

    try {
      const response = await fetch(`/api/documents/id/${documentToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: documentData.description
        }),
      })

      if (response.ok) {
        // Refresh the documents list
        const documentsResponse = await fetch(`/api/documents/search?project_id=${projectId}`)
        if (documentsResponse.ok) {
          const data = await documentsResponse.json()
          setDocuments(data)

          toast.success('Document updated successfully', {
            description: `Updated "${documentToEdit.name || documentToEdit.description || 'Document'}"`
          })
        } else {
          throw new Error('Failed to refresh document list after update')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to update document (${response.status})`)
      }
    } catch (error) {
      console.error('Error updating document:', error)
      toast.error('Failed to update document', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Re-throw to let the dialog handle the error display
    }
  }, [documentToEdit, projectId])

  const handleDeleteSingle = useCallback((document: Document) => {
    setDocumentToDelete(document)
    setIsSingleDeleteDialogOpen(true)
  }, [])

  const handleConfirmSingleDelete = useCallback(async () => {
    if (!documentToDelete) return

    try {
      const response = await fetch(`/api/documents/id/${documentToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh the documents list
        const documentsResponse = await fetch(`/api/documents/search?project_id=${projectId}`)
        if (documentsResponse.ok) {
          const data = await documentsResponse.json()
          setDocuments(data)

          toast.success('Document deleted successfully', {
            description: `Deleted "${documentToDelete.name || documentToDelete.description || 'Document'}"`
          })
        } else {
          throw new Error('Failed to refresh document list after deletion')
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to delete document (${response.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Let the dialog handle the error
    }
  }, [documentToDelete, projectId])

  const handleConfirmBatchDelete = useCallback(async () => {
    const documentCount = selectedDocuments.length
    const documentNames = selectedDocuments.map(d => d.name || d.description || 'Untitled').join(', ')

    try {
      const deletePromises = selectedDocuments.map(document =>
        fetch(`/api/documents/id/${document.id}`, {
          method: 'DELETE',
        })
      )

      await Promise.all(deletePromises)

      // Refresh the documents list
      const response = await fetch(`/api/documents/search?project_id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
        setSelectedDocuments([])

        toast.success(`Successfully deleted ${documentCount} document${documentCount !== 1 ? 's' : ''}`, {
          description: documentCount === 1 ? `Deleted "${documentNames}"` : `Deleted ${documentCount} documents`
        })
      } else {
        throw new Error('Failed to refresh document list after deletion')
      }
    } catch (error) {
      console.error('Error deleting documents:', error)
      toast.error('Failed to delete documents', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      throw error // Let the dialog handle the error
    }
  }, [selectedDocuments, projectId])

  const columns = useMemo(() => [
    Column.text<Document>('name').sortable().withClass("font-medium").truncate().build(),
    Column.text<Document>('description').header('Description').truncate().build(),
    Column.date<Document>('created_at').sortable('Created').build(),
    Column.date<Document>('updated_at').sortable('Updated').build(),
    Actions.create<Document>()
      .copy(
        (document) => document.id,
        'Copy document ID',
        (id) => ({
          title: 'Document ID copied to clipboard',
          description: `ID: ${id}`
        })
      )
      .separator()
      .custom({
        label: 'View File',
        icon: Eye,
        onClick: (document) => viewFile(document)
      })
      .custom({
        label: 'Download File',
        icon: Download,
        onClick: (document) => downloadFile(document)
      })
      .edit(handleEditDocument, 'Edit document')
      .delete(handleDeleteSingle, 'Delete document')
      .build()
  ], [viewFile, downloadFile, handleEditDocument, handleDeleteSingle])

  return (
    // <div className="h-full flex flex-col overflow-hidden">
    //   {/* Project Title Section */}
    //   <div className="flex-shrink-0 px-6 py-4 border-b">
    //     <div className="flex items-center justify-between">
    //       <div>
    //         <h1 className="text-2xl font-semibold mb-2 truncate">{project?.name || 'Loading...'}</h1>
    //         {project?.description && (
    //           <p className="text-muted-foreground">{project.description}</p>
    //         )}
    //       </div>
    //       <div className="flex items-center gap-2">
    //         <Button
    //           variant="destructive"
    //           onClick={handleDeleteSelected}
    //           disabled={selectedDocuments.length === 0}
    //           className="gap-2"
    //         >
    //           <Trash2 className="h-4 w-4" />
    //           Delete Selected ({selectedDocuments.length})
    //         </Button>
    //         <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
    //           <Plus className="h-4 w-4" />
    //           Upload Documents
    //         </Button>
    //       </div>
    //     </div>
    //   </div>
    <>
      <Widget>
        <WidgetHeader>
          <WidgetTitle>{project?.name || 'Loading...'}</WidgetTitle>
          <WidgetDescription>
            {project?.description ? project.description : getRandomEasterEgg()}
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
          pageSize={20}
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
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setDocumentToEdit(null)
        }}
        onSubmit={handleEditSubmit}
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
        isOpen={isSingleDeleteDialogOpen}
        onClose={() => {
          setIsSingleDeleteDialogOpen(false)
          setDocumentToDelete(null)
        }}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Document"
        description={`Are you sure you want to delete "${documentToDelete?.name || documentToDelete?.description || 'this document'}"? This action cannot be undone.`}
        confirmationText="delete"
        confirmButtonText="Delete"
        variant="destructive"
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        title="Delete Documents"
        description={`Are you sure you want to delete ${selectedDocuments.length} document${selectedDocuments.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmationText="delete all"
        confirmButtonText="Delete All"
        variant="destructive"
      />
    </>
  )
}
