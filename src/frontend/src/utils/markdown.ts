// Markdown utility for loading documentation from files
// Documentation files are stored as .md files in src/pages/docs/

// Available documentation files
const availableDocs = [
  'index',
  'getting-started', 
  'projects',
  'security',
  'api-reference'
]

/**
 * Load raw markdown content for a documentation page
 */
export async function loadMarkdownDoc(docName: string): Promise<string> {
  if (!availableDocs.includes(docName)) {
    throw new Error(`Documentation page not found: ${docName}`)
  }

  try {
    // Import the markdown file dynamically
    const response = await fetch(`/docs/${docName}.md`)
    if (!response.ok) {
      throw new Error(`Failed to load documentation: ${response.statusText}`)
    }
    return await response.text()
  } catch (error) {
    // Fallback: try to import as a module (for Vite)
    try {
      const module = await import(`/docs/${docName}.md?raw`)
      return module.default
    } catch (importError) {
      throw new Error(`Failed to load documentation page: ${docName}`)
    }
  }
}

/**
 * Get the title from a documentation page
 */
export function getDocTitle(docName: string): string {
  const titles: Record<string, string> = {
    'index': 'Documentation',
    'getting-started': 'Getting Started',
    'projects': 'Working with Projects',
    'documents': 'Document Management',
    'redaction': 'Redaction Process',
    'security': 'Security Overview',
    'encryption': 'Encryption Details',
    'api-reference': 'API Reference',
    'authentication': 'Authentication',
    'troubleshooting': 'Troubleshooting',
    'faq': 'FAQ'
  }
  
  return titles[docName] || 'Documentation'
}

/**
 * Check if a documentation page exists
 */
export function docExists(docName: string): boolean {
  return availableDocs.includes(docName)
}
