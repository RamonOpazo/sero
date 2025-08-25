import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { loadMarkdownDoc, docExists } from '@/utils/markdown'
import { EmptyState } from '@/components'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

// Import highlight.js theme
import 'highlight.js/styles/github-dark.css'

interface DocumentationViewProps {
  docName?: string
}

export function DocumentationView({ docName }: DocumentationViewProps) {
  const params = useParams()
  const navigate = useNavigate();
  const [docContent, setContent] = useState<string>('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine which doc to load
  const actualDocName = docName || params.docName || 'index'

  // Business logic handlers
  const handleBackToDocumentationIndex = useCallback(() => {
    navigate("/documentation");
  }, [navigate]);

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

  const content = (() => {
    if (error) {
      return (
        <EmptyState
          message="Documentation Error"
          buttonText="Back to Documentation"
          buttonIcon={<ArrowLeft />}
          onButtonClick={handleBackToDocumentationIndex}
        />
      );
    }

    if (isLoading) {
      return (
        <EmptyState
          variant="await"
          message="Loading documentation..."
        />
      );
    }

    return (
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
              const isDocsLike = h.startsWith('./') || h.startsWith('/documentation/')

              // Normalize docs links like ./page.md or /documentation/page.md -> /documentation/page
              if (isDocsLike) {
                // Remove leading './' or '/documentation/'
                const withoutPrefix = h.startsWith('./')
                  ? h.slice(2)
                  : h.replace(/^\/documentation\//, '')

                // Preserve hash fragments if present
                const [base, hash = ''] = withoutPrefix.split('#')
                const slug = base.replace(/\.md$/i, '')
                const to = `/documentation/${slug}${hash ? `#${hash}` : ''}`

                return (
                  <Link
                    to={to}
                    className="docs-internal-link"
                    {...props}
                  >
                    {children}
                  </Link>
                )
              }

              if (isInternal) {
                return (
                  <Link
                    to={h}
                    className="docs-internal-link"
                    {...props}
                  >
                    {children}
                  </Link>
                )
              }

              return (
                <Link
                  to={h}
                  className="docs-external-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </Link>
              )
            },
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto">
                <table {...props}>{children}</table>
              </div>
            )
          }}
        >
          {docContent}
        </ReactMarkdown>
      </div>
    )
  })();

  return content
}
