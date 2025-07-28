import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { storePassword } from '@/utils/passwordManager'
import type { Document } from '@/types'

interface PendingFileAction {
  document: Document
  fileType: 'original' | 'obfuscated'
  action: 'view' | 'download'
}

export function usePasswordProtectedFile(projectId?: string) {
  const navigate = useNavigate()
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isValidatingPassword, setIsValidatingPassword] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingFileAction | null>(null)

  const requestFileAccess = useCallback((
    document: Document, 
    fileType: 'original' | 'obfuscated', 
    action: 'view' | 'download'
  ) => {
    setPendingAction({ document, fileType, action })
    setPasswordError(null)
    setIsPasswordDialogOpen(true)
  }, [])

  const handlePasswordConfirm = useCallback(async (password: string) => {
    if (!pendingAction || !projectId) return

    const { document, fileType, action } = pendingAction
    const file = fileType === 'original' ? document.original_file : document.redacted_file

    if (!file) {
      setPasswordError('File not found')
      return
    }

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
        // Password is correct
        if (action === 'view') {
          // Store password securely and navigate to file viewer
          storePassword(document.id, file.id, password)
          navigate(`/projects/${projectId}/documents/${document.id}/files/${file.id}`)
        } else if (action === 'download') {
          // Trigger file download
          const downloadUrl = `/api/files/id/${file.id}/download?password=${encodeURIComponent(password)}`
          const link = window.document.createElement('a')
          link.href = downloadUrl
          link.download = `document_${file.id}.pdf`
          link.click()

          const fileTypeLabel = fileType === 'original' ? 'original' : 'redacted'
          toast.success('Download started', {
            description: `Downloading ${fileTypeLabel} file: document_${file.id}.pdf`
          })
        }

        // Success - close dialog and reset state
        setIsPasswordDialogOpen(false)
        setPendingAction(null)
        setPasswordError(null)
      } else if (response.status === 401) {
        setPasswordError('Incorrect password. Please try again.')
      } else if (response.status === 500) {
        setPasswordError('Server error accessing file. Please try again later.')
      } else {
        setPasswordError(`Error accessing file (${response.status}). Please try again.`)
      }
    } catch (error) {
      console.error('Password validation error:', error)
      setPasswordError('Network error. Please try again.')
    } finally {
      setIsValidatingPassword(false)
    }
  }, [pendingAction, projectId, navigate])

  const handlePasswordCancel = useCallback(() => {
    setIsPasswordDialogOpen(false)
    setPendingAction(null)
    setPasswordError(null)
  }, [])

  // Convenience methods for common actions
  const viewFile = useCallback((document: Document, fileType: 'original' | 'obfuscated' = 'original') => {
    requestFileAccess(document, fileType, 'view')
  }, [requestFileAccess])

  const downloadFile = useCallback((document: Document, fileType: 'original' | 'obfuscated' = 'original') => {
    requestFileAccess(document, fileType, 'download')
  }, [requestFileAccess])

  return {
    // State
    isPasswordDialogOpen,
    passwordError,
    isValidatingPassword,
    
    // Actions
    viewFile,
    downloadFile,
    requestFileAccess,
    
    // Dialog handlers
    handlePasswordConfirm,
    handlePasswordCancel,
  }
}
