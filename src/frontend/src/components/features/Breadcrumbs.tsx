import React, { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbData {
  label: string
  href?: string
  isActive?: boolean
}

export function Breadcrumbs() {
  const location = useLocation()
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const [fileType, setFileType] = useState<string>('')
  
  const breadcrumbs: BreadcrumbData[] = []
  
  // Fetch file type when viewing a document
  useEffect(() => {
    if (pathSegments[0] === 'project' && pathSegments[2] === 'document' && pathSegments[3]) {
      const documentId = pathSegments[3]
      const urlParams = new URLSearchParams(location.search)
      const viewType = urlParams.get('view') // assuming URL like ?view=original or ?view=obfuscated
      
      if (viewType) {
        setFileType(viewType === 'original' ? 'Original' : 'Obfuscated')
      } else {
        // Fetch document to determine default file type
        fetch(`/api/documents/id/${documentId}`)
          .then(res => res.json())
          .then(data => {
            // Default to original file if available, otherwise obfuscated
            if (data.original_file) {
              setFileType('Original')
            } else if (data.obfuscated_file) {
              setFileType('Obfuscated')
            } else {
              setFileType('PDF') // fallback
            }
          })
          .catch(() => setFileType('PDF')) // fallback on error
      }
    }
  }, [location.pathname, location.search])
  
  // Build breadcrumbs based on current path
  if (pathSegments.length === 0) {
    // Projects view
    breadcrumbs.push({ label: 'Projects', isActive: true })
  } else if (pathSegments[0] === 'project' && pathSegments[1]) {
    const projectId = pathSegments[1]
    
    if (pathSegments.length === 2) {
      // Documents view: Projects > Documents
      breadcrumbs.push(
        { label: 'Projects', href: '/' },
        { label: 'Documents', isActive: true }
      )
    } else if (pathSegments[2] === 'document' && pathSegments[3]) {
      // File viewer: Projects > Documents > File [type]
      const fileLabel = fileType ? `File [${fileType}]` : 'File'
      breadcrumbs.push(
        { label: 'Projects', href: '/' },
        { label: 'Documents', href: `/project/${projectId}` },
        { label: fileLabel, isActive: true }
      )
    }
  } else {
    // Fallback to Projects
    breadcrumbs.push({ label: 'Projects', href: '/', isActive: true })
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.href && !item.isActive ? (
                <BreadcrumbLink asChild>
                  <Link to={item.href} className="truncate">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
