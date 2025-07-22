import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Document } from '@/types'

export function DocumentEditor() {
  const { documentId } = useParams<{ projectId: string; documentId: string }>()
  const [document, setDocument] = useState<Document | null>(null)

  useEffect(() => {
    if (!documentId) return

    // Fetch document details
    fetch(`/api/documents/id/${documentId}`)
      .then(res => res.json())
      .then(data => setDocument(data))
  }, [documentId])

  if (!document) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">
        {document.original_file?.filename || document.description || 'Untitled Document'}
      </h2>
      <p className="text-muted-foreground mb-4">{document.description}</p>
      
      {/* Placeholder for PDF viewer and selection tools */}
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        PDF Viewer and Selection Tools will go here
        <br />
        Document ID: {document.id}
        <br />
        Status: {document.status}
        <br />
        Original File: {document.original_file?.filename || 'None'}
        <br />
        Selections: {document.original_file?.selections?.length || 0}
        <br />
        Prompts: {document.original_file?.prompts?.length || 0}
      </div>
    </div>
  )
}
