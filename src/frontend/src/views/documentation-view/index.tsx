import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { loadMarkdownDoc, docExists } from '@/utils/markdown'

// Import highlight.js theme
import 'highlight.js/styles/github-dark.css'

interface DocumentationViewProps {
  docName?: string
}

export function DocumentationView({ docName }: DocumentationViewProps) {
  const params = useParams()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine which doc to load
  const actualDocName = docName || params.docName || 'index'

  useEffect(() => {
    async function loadDoc() {
      setLoading(true)
      setError(null)
      
      try {
        // Check if the doc exists
        if (!docExists(actualDocName)) {
          setError(`Documentation page "${actualDocName}" not found`)
          setLoading(false)
          return
        }

        const markdownContent = await loadMarkdownDoc(actualDocName)
        setContent(markdownContent)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documentation')
      } finally {
        setLoading(false)
      }
    }

    loadDoc()
  }, [actualDocName])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-destructive mb-2">Documentation Error</h1>
          <p className="text-destructive/80">{error}</p>
          <div className="mt-4">
            <a 
              href="/documentation" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Documentation
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="documentation-content space-y-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeHighlight,
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: 'wrap' }]
          ]}
          components={{
            a: ({ href, children, ...props }) => {
              const h = typeof href === 'string' ? href : ''
              const isInternal = h.startsWith('/') || h.startsWith('#')
              const isDocsInternal = h.startsWith('./')
              
              if (isDocsInternal) {
                // Convert ./page-name to /documentation/page-name
                const docPath = h.replace('./', '/documentation/')
                return (
                  <a 
                    href={docPath} 
                    className="docs-internal-link" 
                    {...props}
                  >
                    {children}
                  </a>
                )
              }
              
              if (isInternal) {
                return (
                  <a 
                    href={h} 
                    className="docs-internal-link" 
                    {...props}
                  >
                    {children}
                  </a>
                )
              }
              
              return (
                <a 
                  href={h} 
                  className="docs-external-link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </a>
              )
            },
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto">
                <table {...props}>{children}</table>
              </div>
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
