import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Document as DocumentType } from '@/types'

interface FileHeaderProps {
  documentData: DocumentType
  viewMode: 'original' | 'obfuscated'
  onViewModeChange: (mode: 'original' | 'obfuscated') => void
}

export function FileHeader({ documentData, viewMode, onViewModeChange }: FileHeaderProps) {
  return (
    <div className="flex-shrink-0 p-6 border-b">
      <h1 className="text-xl font-semibold mb-2 truncate">
        {documentData.original_file?.filename || documentData.description || 'Untitled Document'}
      </h1>
      {documentData.description && (
        <p className="text-muted-foreground text-sm mb-4">{documentData.description}</p>
      )}
      
      {/* View mode switcher */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={viewMode === 'original' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('original')}
          disabled={!documentData.original_file}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-2" />
          Original
        </Button>
        
        <Button
          variant={viewMode === 'obfuscated' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('obfuscated')}
          disabled={!documentData.obfuscated_file}
          className="flex-1"
        >
          <EyeOff className="h-4 w-4 mr-2" />
          Obfuscated
        </Button>
      </div>

      {/* Document metadata */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge 
            variant={documentData.status === 'processed' ? 'default' : 
                    documentData.status === 'pending' ? 'secondary' : 'destructive'}
          >
            {documentData.status}
          </Badge>
        </div>
        
        {documentData.original_file?.selections && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Selections:</span>
            <Badge variant="secondary">{documentData.original_file.selections.length}</Badge>
          </div>
        )}
        
        {documentData.original_file?.prompts && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Prompts:</span>
            <Badge variant="secondary">{documentData.original_file.prompts.length}</Badge>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">File:</span>
          <Badge variant="outline">{viewMode === 'obfuscated' ? 'Obfuscated' : 'Original'}</Badge>
        </div>
      </div>
    </div>
  )
}
