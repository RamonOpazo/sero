import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable';
import { createDocumentsColumns } from '@/components/columns/documents-columns';
import { EmptyState } from '@/components/EmptyState'
import { PasswordDialog } from '@/components/PasswordDialog'
import type { Document, Project } from '@/types'

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([])
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [pendingViewFile, setPendingViewFile] = useState<{ document: Document; fileType: 'original' | 'obfuscated' } | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isValidatingPassword, setIsValidatingPassword] = useState(false)

  useEffect(() => {
    if (!projectId) return

    // Fetch project details
    fetch(`/api/projects/id/${projectId}`)
      .then(res => res.json())
      .then(data => setProject(data))

    // Fetch documents for this project
    fetch(`/api/documents/search?project_id=${projectId}`)
      .then(res => res.json())
      .then(data => setDocuments(data))
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
        // Password is correct (200 OK or 206 Partial Content for range requests), navigate to file viewer
        navigate(`/project/${projectId}/document/${document.id}/file/${file.id}?password=${encodeURIComponent(password)}`)
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

  const handlePasswordCancel = useCallback(() => {
    setIsPasswordDialogOpen(false)
    setPendingViewFile(null)
    setPasswordError(null)
  }, [])

  const documentsColumns = createDocumentsColumns(handleViewFile)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Project Title Section */}
      <div className="flex-shrink-0 px-6 py-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2 truncate w-[20em]">{project?.name || 'Loading...'}</h1>
            {project?.description && (
              <p className="text-muted-foreground truncate w-[50em]">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedDocuments.length > 0 && (
        <div className="flex-shrink-0 px-6 py-3 bg-muted/20 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
            </span>
            <Button variant="destructive" size="sm">
              Delete Selected
            </Button>
          </div>
        </div>
      )}

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
            buttonText="Upload Documents"
            buttonIcon={<Upload className="h-4 w-4" />}
            onButtonClick={() => console.log('Upload documents clicked')}
          />
        )}
      </div>
      
      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
        error={passwordError}
        isLoading={isValidatingPassword}
      />
    </div>
  )
}
