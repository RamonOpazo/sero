import { FileText, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Document as DocumentType } from '@/types'

interface DocumentHeaderProps {
  documentData: DocumentType
  viewMode: 'original' | 'obfuscated'
  onViewModeChange: (mode: 'original' | 'obfuscated') => void
}

export function DocumentHeader({ documentData, viewMode, onViewModeChange }: DocumentHeaderProps) {
  return (
    <div className="flex-shrink-0 p-6 border-b">
      {/* Status badge above title */}
      <div className="mb-2">
        <Badge 
          variant={documentData.redacted_file ? 'default' : 'secondary'}
        >
          {documentData.redacted_file ? 'Processed' : 'Pending'}
        </Badge>
      </div>
      
      <h1 className="text-xl font-semibold mb-2 truncate">
        {documentData.name || documentData.description || 'Untitled Document'}
      </h1>
      
      {documentData.description && (
        <p className="text-muted-foreground text-sm mb-4">{documentData.description}</p>
      )}
      
      {/* View mode switcher */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'original' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('original')}
          disabled={!documentData.original_file}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Original
        </Button>
        
        <Button
          variant={viewMode === 'obfuscated' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('obfuscated')}
          disabled={!documentData.redacted_file}
          className="flex-1"
        >
          <Shield className="h-4 w-4 mr-2" />
          Obfuscated
        </Button>
      </div>
    </div>
  )
}
