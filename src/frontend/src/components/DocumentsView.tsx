import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable';
import { createDocumentsColumns } from '@/components/columns/documents-columns';
import { EmptyState } from '@/components/EmptyState'
import { PasswordDialog } from '@/components/PasswordDialog'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { CreateDocumentDialog } from '@/components/CreateDocumentDialog'
import { EditDocumentDialog } from '@/components/EditDocumentDialog'
import { storePassword } from '@/utils/passwordManager'
import type { Document, Project, DocumentUpload } from '@/types'

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([])
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null)
  const [pendingViewFile, setPendingViewFile] = useState<{ document: Document; fileType: 'original' | 'obfuscated' } | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isValidatingPassword, setIsValidatingPassword] = useState(false)

  useEffect(() => {
    if (!projectId) return

    // Fetch project details
    fetch(`/api/projects/id/${projectId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch project: ${res.status}`);
        }
        return res.json();
      })
      .then(data => setProject(data))
      .catch(err => {
        console.error('Error fetching project:', err);
        toast.error('Failed to load project details', {
          description: 'Please refresh the page to try again.'
        });
      });

    // Fetch documents for this project
    fetch(`/api/documents/search?project_id=${projectId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch documents: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('Documents loaded:', data.length, 'documents');
        setDocuments(data);
      })
      .catch(err => {
        console.error('Error fetching documents:', err);
        toast.error('Failed to load documents', {
          description: 'Please refresh the page to try again.'
        });
      });
  }, [projectId])

  const handleSelectionChange = useCallback((selectedRows: Document[]) => {
    setSelectedDocuments(selectedRows)
  }, [])

  const handleViewFile = useCallback((document: Document, fileType: 'original' | 'obfuscated') => {
    // For now, let's assume all files require a password
    // In a real implementation, you might check if the file is password-protected first
    setPendingViewFile({ document, fileType })
    setIsPasswordDialogOpen(true)
  }, [])

  const handlePasswordConfirm = useCallback(async (password: string) => {
    if (!pendingViewFile || !projectId) return
    
    const { document, fileType } = pendingViewFile
    const file = fileType === 'original' ? document.original_file : document.obfuscated_file
    
    if (!file) return
    
    setIsValidatingPassword(true)
    setPasswordError(null)
    
    try {
      // Validate password by attempting to access the file with a small range
      const response = await fetch(`/api/files/id/${file.id}/download?stream=true&password=${encodeURIComponent(password)}`, {
        method: 'GET',
        headers: {
          'Range': 'bytes=0-0' // Request only the first byte to minimize data transfer
        }
      })
      
      if (response.ok || response.status === 206) {
        // Password is correct (200 OK or 206 Partial Content for range requests)
        // Store password securely and navigate to file viewer without password in URL
        storePassword(document.id, file.id, password)
        navigate(`/project/${projectId}/document/${document.id}/file/${file.id}`)
        setIsPasswordDialogOpen(false)
        setPendingViewFile(null)
        setPasswordError(null)
      } else if (response.status === 401) {
        // Password is incorrect
        setPasswordError('Incorrect password. Please try again.')
      } else if (response.status === 500) {
        // Server error retrieving file
        setPasswordError('Server error accessing file. Please try again later.')
      } else {
        // Other error
        setPasswordError(`Error accessing file (${response.status}). Please try again.`)
      }
    } catch (error) {
      console.error('Password validation error:', error)
      setPasswordError('Network error. Please try again.')
    } finally {
      setIsValidatingPassword(false)
    }
  }, [pendingViewFile, projectId, navigate])

  const handleOpenCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true)
  }, [])

  const handleCloseCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false)
  }, [])

  const handleCreateDocuments = useCallback(async (uploadData: DocumentUpload) => {
    try {
      const formData = new FormData();
      
      // Add all files to the form data
      Array.from(uploadData.files).forEach(file => {
        formData.append('files', file);
      });
      
      // Add other fields
      formData.append('password', uploadData.password);
      if (uploadData.description) {
        formData.append('description_template', uploadData.description);
      }
      
      const response = await fetch(`/api/projects/id/${projectId}/upload-files`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Refresh the documents list
        const documentsResponse = await fetch(`/api/documents/search?project_id=${projectId}`);
        if (documentsResponse.ok) {
          const data = await documentsResponse.json();
          setDocuments(data);
          
          const fileCount = uploadData.files.length;
          toast.success(`Successfully uploaded ${fileCount} document${fileCount !== 1 ? 's' : ''}`, {
            description: fileCount === 1 ? 
              `Uploaded "${uploadData.files[0].name}"` : 
              `Uploaded ${fileCount} documents`
          });
        } else {
          throw new Error('Failed to refresh document list after upload');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload documents (${response.status})`);
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
      throw error; // Re-throw to let the dialog handle the error display
    }
  }, [projectId]);

  const handlePasswordCancel = useCallback(() => {
    setIsPasswordDialogOpen(false)
    setPendingViewFile(null)
    setPasswordError(null)
  }, [])

  const handleEditDocument = useCallback((document: Document) => {
    setDocumentToEdit(document)
    setIsEditDialogOpen(true)
  }, [])

  const handleCloseEditDialog = useCallback(() => {
    setIsEditDialogOpen(false)
    setDocumentToEdit(null)
  }, [])

  const handleEditSubmit = useCallback(async (documentData: { description?: string }) => {
    if (!documentToEdit) return;
    
    try {
      const response = await fetch(`/api/documents/id/${documentToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: documentData.description
        }),
      });
      
      if (response.ok) {
        // Refresh the documents list
        const documentsResponse = await fetch(`/api/documents/search?project_id=${projectId}`);
        if (documentsResponse.ok) {
          const data = await documentsResponse.json();
          setDocuments(data);
          
          toast.success('Document updated successfully', {
            description: `Updated "${documentToEdit.original_file?.filename || documentToEdit.description || 'Document'}"`
          });
        } else {
          throw new Error('Failed to refresh document list after update');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update document (${response.status})`);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
      throw error; // Re-throw to let the dialog handle the error display
    }
  }, [documentToEdit, projectId]);

  const handleDeleteSingle = useCallback((document: Document) => {
    setDocumentToDelete(document)
    setIsSingleDeleteDialogOpen(true)
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (selectedDocuments.length === 0) return;
    setIsDeleteDialogOpen(true);
  }, [selectedDocuments]);

  const confirmSingleDelete = useCallback(async () => {
    if (!documentToDelete) return;
    
    try {
      const response = await fetch(`/api/documents/id/${documentToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Refresh the documents list
        const documentsResponse = await fetch(`/api/documents/search?project_id=${projectId}`);
        if (documentsResponse.ok) {
          const data = await documentsResponse.json();
          setDocuments(data);
          
          toast.success('Document deleted successfully', {
            description: `Deleted "${documentToDelete.original_file?.filename || documentToDelete.description || 'Document'}"`
          });
        } else {
          throw new Error('Failed to refresh document list after deletion');
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to delete document (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
      throw error; // Let the dialog handle the error
    }
  }, [documentToDelete, projectId]);

  const confirmBatchDelete = useCallback(async () => {
    const documentCount = selectedDocuments.length;
    const documentNames = selectedDocuments.map(d => d.original_file?.filename || d.description || 'Untitled').join(', ');
    
    try {
      const deletePromises = selectedDocuments.map(document => 
        fetch(`/api/documents/id/${document.id}`, {
          method: 'DELETE',
        })
      );
      
      await Promise.all(deletePromises);
      
      // Refresh the documents list
      const response = await fetch(`/api/documents/search?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        setSelectedDocuments([]);
        
        toast.success(`Successfully deleted ${documentCount} document${documentCount !== 1 ? 's' : ''}`, {
          description: documentCount === 1 ? `Deleted "${documentNames}"` : `Deleted ${documentCount} documents`
        });
      } else {
        throw new Error('Failed to refresh document list after deletion');
      }
    } catch (error) {
      console.error('Error deleting documents:', error);
      toast.error('Failed to delete documents', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
      throw error; // Let the dialog handle the error
    }
  }, [selectedDocuments, projectId]);

  const documentsColumns = createDocumentsColumns(handleViewFile, handleDeleteSingle, handleEditDocument)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Project Title Section */}
      <div className="flex-shrink-0 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2 truncate">{project?.name || 'Loading...'}</h1>
            {project?.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedDocuments.length === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedDocuments.length})
            </Button>
            <Button onClick={handleOpenCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Documents
            </Button>
          </div>
        </div>
      </div>

      {/* Documents Data Table */}
      <div className="flex-1 overflow-hidden px-6">
        {documents.length > 0 ? (
          <DataTable
            columns={documentsColumns}
            data={documents}
            searchKey="filename"
            searchPlaceholder="Search documents..."
            onRowSelectionChange={handleSelectionChange}
            pageSize={20}
          />
        ) : (
          <EmptyState
            message="No documents found"
            buttonText="Upload your first document"
            buttonIcon={<Plus className="h-4 w-4" />}
            onButtonClick={handleOpenCreateDialog}
          />
        )}
    </div>

    <CreateDocumentDialog
      isOpen={isCreateDialogOpen}
      onClose={handleCloseCreateDialog}
      onSubmit={handleCreateDocuments}
      projectId={projectId || ''}
    />

    <EditDocumentDialog
      isOpen={isEditDialogOpen}
      onClose={handleCloseEditDialog}
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
        setIsSingleDeleteDialogOpen(false);
        setDocumentToDelete(null);
      }}
      onConfirm={confirmSingleDelete}
      title="Delete Document"
      description={`Are you sure you want to delete "${documentToDelete?.original_file?.filename || documentToDelete?.description || 'this document'}"? This action cannot be undone.`}
      confirmationText="delete"
      confirmButtonText="Delete"
      variant="destructive"
    />
    
    <ConfirmationDialog
      isOpen={isDeleteDialogOpen}
      onClose={() => setIsDeleteDialogOpen(false)}
      onConfirm={confirmBatchDelete}
      title="Delete Documents"
      description={`Are you sure you want to delete ${selectedDocuments.length} document${selectedDocuments.length !== 1 ? 's' : ''}? This action cannot be undone.`}
      confirmationText="delete all"
      confirmButtonText="Delete All"
      variant="destructive"
    />
  </div>
  )
}
