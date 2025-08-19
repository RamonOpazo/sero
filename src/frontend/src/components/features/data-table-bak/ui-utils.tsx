import React from 'react'
import { Badge } from '@/components/ui-extensions/badge'

// Date formatter utility
const formatDate = (dateString: string) => {
  if (!dateString) return "-"
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return 'Unknown'
  }
}

// Date display component
export const DateDisplay: React.FC<{ date: string; className?: string }> = ({ 
  date, 
  className = '' 
}) => (
  <div className={`text-muted-foreground text-sm ${className}`}>
    {formatDate(date)}
  </div>
)

// Count badge component (for numeric values) - uses extended badge with standard variants
export const CountBadge: React.FC<{ 
  count: string | number
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string 
}> = ({ 
  count, 
  variant = 'secondary',
  className = '' 
}) => (
  <Badge variant={variant} className={className}>
    {String(count || 0)}
  </Badge>
)

// Status formatter utility
export const formatStatus = (status: string): string => {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

// Status to semantic mapping
const getStatusSemantic = (status: string): 'warning' | 'info' | 'success' | 'danger' | 'neutral' => {
  switch (status.toLowerCase()) {
    case 'awaiting':
    case 'pending':
      return 'warning'
    case 'in_progress':
      return 'info'
    case 'completed':
    case 'processed':
      return 'success'
    case 'error':
    case 'failed':
      return 'danger'
    default:
      return 'neutral'
  }
}

// Status display component using semantic variants
export const StatusDisplay: React.FC<{ 
  status: string
  className?: string 
}> = ({ status, className = '' }) => {
  const formattedStatus = formatStatus(status)
  const semantic = getStatusSemantic(status)
  
  return (
    <Badge variant="outline" semantic={semantic} className={className}>
      {formattedStatus}
    </Badge>
  )
}

// Generic text display with truncation
export const TextDisplay: React.FC<{ 
  text: string | number
  truncate?: number | boolean
  className?: string 
}> = ({ text, truncate, className = '' }) => {
  const content = String(text || '-')
  
  if (truncate) {
    const maxLength = typeof truncate === 'number' ? truncate : 50
    const truncatedContent = content.length > maxLength 
      ? `${content.slice(0, maxLength)}...` 
      : content
    
    return (
      <span className={`${className}`} title={content}>
        {truncatedContent}
      </span>
    )
  }
  
  return <span className={className}>{content}</span>
}
