import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Document } from '@/types'

export function DocumentEditor() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>()
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
      <h2 className="text-2xl font-semibold mb-4">{document.title}</h2>
      <p className="text-muted-foreground mb-4">{document.description}</p>
      
      {/* Placeholder for PDF viewer and selection tools */}
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        PDF Viewer and Selection Tools will go here
        <br />
        Document ID: {document.id}
        <br />
        Selections: {document.selections?.length || 0}
        <br />
        Prompts: {document.prompts?.length || 0}
      </div>
    </div>
  )
}
