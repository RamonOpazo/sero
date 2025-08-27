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
import {
  TypographyTitle,
  // TypographyLead,
  // TypographySubtitle,
  TypographyMuted,
  TypographyUnorderedList,
  TypographyLink,
  // TypographyHeader,
  // TypographyContent,
  TypographyH2,
  TypographyH3,
} from '@/components/typography'

// Import highlight.js theme
import 'highlight.js/styles/github-dark.css'
import { TypographyInlineCode, TypographyOrderedList } from '@/components/typography/typography'

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
    navigate("/docs");
  }, [navigate]);

  useEffect(() => {
    async function loadDoc() {
      setLoading(true)
      setError(null)

      try {
        // Check if the doc exists
        if (!(await docExists(actualDocName))) {
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
      <div className="prose prose-slate dark:prose-invert max-w-none">
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
              const isDocsLike = h.startsWith('./') || h.startsWith('/docs/')

              // Normalize docs links like ./page.md or /docs/page.md -> /docs/page
              if (isDocsLike) {
                // Remove leading './' or '/docs/'
                const withoutPrefix = h.startsWith('./')
                  ? h.slice(2)
                  : h.replace(/^\/docs\//, '')

                // Preserve hash fragments if present
                const [base, hash = ''] = withoutPrefix.split('#')
                const slug = base.replace(/\.md$/i, '')
                const to = `/docs/${slug}${hash ? `#${hash}` : ''}`

                return (
                  <TypographyLink to={to} {...props}>
                    {children}
                  </TypographyLink>
                )
              }

              if (isInternal) {
                return (
                  <TypographyLink to={h} {...props}>
                    {children}
                  </TypographyLink>
                )
              }

              return (
                <TypographyLink to={h} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </TypographyLink>
              )
            },
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto">
                <table {...props}>{children}</table>
              </div>
            ),
            h1: ({ children, ...props }) => (
              <TypographyTitle {...props}>{children}</TypographyTitle>
            ),
            h2: ({ children, ...props }) => (
              <TypographyH2 {...props}>{children}</TypographyH2>
            ),
            h3: ({ children, ...props }) => (
              <TypographyH3 {...props}>{children}</TypographyH3>
            ),
            p: ({ children, ...props }) => (
              <TypographyMuted {...props}>{children}</TypographyMuted>
            ),
            strong: ({ node, ...props }) => (
              <strong className="text-md text-foreground/80 mb-3 mt-3" {...props} />
            ),
            ul: ({ children, ...props }) => (
              <TypographyUnorderedList {...props}>{children}</TypographyUnorderedList>
            ),
            ol: ({ children, ...props }) => (
              <TypographyOrderedList {...props}>{children}</TypographyOrderedList>
            ),
            li: ({ node, ...props }) => (
              <li {...props} />
            ),
            pre: ({ node, className, ...props }) => (
              <pre className={`p-0 rounded-sm ${className}`} {...props} />
            ),
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "")
              const lang = match ? match[1] : ""
              if (lang) {
                return (
                  <>
                    <span className="font-mono font-bold inline-block px-4 pb-1 pt-2 text-md m-0 text-right w-full">
                      {lang}
                    </span>
                    <code className={`block p-4 ${className}`} {...props}>
                      {children}
                    </code>
                  </>
                )
              }

              return (
                <TypographyInlineCode {...props}>{children}</TypographyInlineCode>
              )
            }
          }}
        >
          {docContent}
        </ReactMarkdown>
      </div >
    )
  })();

  return content
}
