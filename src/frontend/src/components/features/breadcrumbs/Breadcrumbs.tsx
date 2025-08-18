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
import { Home as HomeIcon } from 'lucide-react'

interface BreadcrumbData {
  label: string
  href?: string
  isActive?: boolean
  isHome?: boolean
}

const segmentToLabelMap: { [key: string]: string } = {
  'projects': 'Projects',
  'documents': 'Documents',
  'document': 'Document',
  'files': 'Files',
  'original-file': 'Original File',
  'redacted-file': 'Redacted File',
  'documentation': 'Documentation',
  'getting-started': 'Getting Started',
  'api-reference': 'API Reference',
  'security': 'Security',
  'troubleshooting': 'Troubleshooting',
  'developer': 'Developer',
  'api-swagger': 'API Documentation',
  'crypto-test': 'Crypto Test',
  'settings': 'Settings',
}

// Define app routes as they are in App.tsx
const appRoutes = [
  '/',
  '/projects',
  '/projects/:projectId/documents',
  '/projects/:projectId/documents/:documentId/original-file',
  '/projects/:projectId/documents/:documentId/redacted-file',
  '/documentation',
  '/documentation/:docName',
  '/developer/api-swagger',
  '/developer/crypto-test',
  '/settings',
];

export function Breadcrumbs() {
  const location = useLocation()
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbData[]>([])

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const newBreadcrumbs: BreadcrumbData[] = []

    // Always add a dedicated Home breadcrumb
    newBreadcrumbs.push({ label: '', href: '/', isHome: true, isActive: pathSegments.length === 0 })

    // Find the most specific matching route pattern
    let matchedRoutePattern: string | undefined;
    // Sort patterns by length descending to prioritize more specific matches
    const sortedAppRoutes = [...appRoutes].sort((a, b) => b.length - a.length);

    for (const pattern of sortedAppRoutes) {
      // Convert pattern to a regex that matches actual paths
      // Escape special characters in the pattern, then replace parameter placeholders
      const regex = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\$&').replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$');
      if (regex.test(location.pathname)) {
        matchedRoutePattern = pattern;
        break;
      }
    }

    if (matchedRoutePattern && matchedRoutePattern !== '/') {
      // Check if this is a simple static route (no parameters)
      if (!matchedRoutePattern.includes(':')) {
        // Simple static route - just build breadcrumbs from the path segments
        let accumulatedPath = '';
        pathSegments.forEach((segment) => {
          accumulatedPath += '/' + segment;
          const label = segmentToLabelMap[segment] || segment;
          
          newBreadcrumbs.push({
            label: label,
            href: accumulatedPath,
            isActive: false,
          });
        });
      } else {
        // Complex route with parameters - use the existing logic
        const patternParts = matchedRoutePattern.split('/').filter(Boolean);
        let accumulatedHrefSegments: string[] = [];
        let actualSegmentIndex = 0;

        for (let i = 0; i < patternParts.length; i++) {
          const patternPart = patternParts[i];
          const actualSegment = pathSegments[actualSegmentIndex];

          if (patternPart.startsWith(':')) {
            // This is a path parameter. We don't add it as a breadcrumb label,
            // but we must include its actual value in the accumulatedHrefSegments
            // for subsequent breadcrumb links.
            accumulatedHrefSegments.push(actualSegment);
            actualSegmentIndex++;
            continue; // Skip adding this as a breadcrumb item
          }

          // This is a static segment. Add its label to breadcrumbs.
          accumulatedHrefSegments.push(actualSegment);
          const href = '/' + accumulatedHrefSegments.join('/');
          const label = segmentToLabelMap[actualSegment] || actualSegment;

          newBreadcrumbs.push({
            label: label,
            href: href,
            isActive: false,
          });
          actualSegmentIndex++;
        }
      }
    }

    // After building all breadcrumbs, mark the last one as active
    if (newBreadcrumbs.length > 0) {
      newBreadcrumbs[newBreadcrumbs.length - 1].isActive = true;
    }

    setBreadcrumbs(newBreadcrumbs);
  }, [location.pathname]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isActive ? (
                <BreadcrumbPage className="truncate">
                  {item.isHome ? <HomeIcon className="h-4 w-4" /> : item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href || '/'} className="truncate">
                    {item.isHome ? <HomeIcon className="h-4 w-4" /> : item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}