import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, MapPin, MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react'
import type { Document, Project, DocumentStatus } from '@/types'

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
  processed: { icon: CheckCircle, color: 'bg-green-500', label: 'Processed' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' }
}

export function DocumentsView() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const documentsPerPage = 20

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

  const filteredDocuments = documents.filter(doc =>
    (doc.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * documentsPerPage,
    currentPage * documentsPerPage
  )

  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage)

  const getDocumentStatus = (doc: Document): DocumentStatus => {
    if (!doc.original_file) return 'failed'
    return doc.status
  }

  const hasOriginalFile = (doc: Document) => !!doc.original_file

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-2">{project?.name}</h2>
          <p className="text-muted-foreground">{project?.description}</p>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center justify-between">
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-96"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button>
              + New Document
            </Button>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {paginatedDocuments.map(document => {
          const status = getDocumentStatus(document)
          const StatusIcon = statusConfig[status].icon
          // Get selections and prompts from original file
          const selectionsCount = document.original_file?.selections?.length || 0
          const promptsCount = document.original_file?.prompts?.length || 0

          return (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig[status].label}
                  </Badge>
                  {hasOriginalFile(document) && (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                  {document.original_file?.filename || document.description || 'Untitled Document'}
                </h3>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{selectionsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{promptsCount}</span>
                  </div>
                </div>

                {hasOriginalFile(document) ? (
                  <Link to={`/project/${projectId}/document/${document.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Open
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    No Original File
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          })}
          
          {totalPages > 5 && <span className="text-muted-foreground">...</span>}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
