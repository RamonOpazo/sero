import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Info, 
  FileText, 
  Target, 
  MessageSquare, 
  Hash,
  Calendar,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { type DocumentType } from "@/types";
import { useViewerState } from '../hooks/useViewerState';

type Props = { 
  document: DocumentType;
  documentSize: { width: number; height: number };
  isVisible: boolean;
  onToggleVisibility: () => void;
};

interface InfoSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function InfoSection({ title, icon, children, defaultExpanded = false }: InfoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border rounded-lg">
      <button
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isExpanded && (
        <div className="p-3 pt-0 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

export default function InfoLayer({ document, documentSize, isVisible, onToggleVisibility }: Props) {
  const { currentPage, numPages, zoom } = useViewerState();

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Get current file information
  const currentFile = document.original_file || document.redacted_file;
  const fileWithBlob = document.files?.find(f => f.id === currentFile?.id);

  return (
    <div 
      className={`
        absolute top-4 right-4 z-50
        transition-all duration-300 ease-in-out
        ${isVisible 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full pointer-events-none'
        }
      `}
      style={{
        // Ensure it doesn't extend beyond the document bounds
        maxWidth: Math.min(320, documentSize.width * 0.4),
      }}
    >
      <Card className="backdrop-blur-sm bg-background/95 border-border/50 shadow-xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4" />
              <CardTitle className="text-sm">Document Info</CardTitle>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onToggleVisibility}
              className="h-6 w-6 p-0 hover:bg-destructive/10"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Document Overview */}
          <InfoSection 
            title="Overview" 
            icon={<FileText className="h-4 w-4" />}
            defaultExpanded={true}
          >
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-1">{document.name}</h4>
                {document.description && (
                  <p className="text-xs text-muted-foreground">{document.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Page:</span>
                  <span className="ml-1 font-medium">{currentPage + 1} / {numPages}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Zoom:</span>
                  <span className="ml-1 font-medium">{Math.round(zoom * 100)}%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {document.original_file ? 'Original' : 'Redacted'}
                </Badge>
                {document.prompts.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {document.prompts.length} Prompts
                  </Badge>
                )}
                {document.selections.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    {document.selections.length} Selections
                  </Badge>
                )}
              </div>
            </div>
          </InfoSection>

          {/* File Details */}
          {currentFile && (
            <InfoSection 
              title="File Details" 
              icon={<Hash className="h-4 w-4" />}
            >
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-mono">{currentFile.file_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MIME:</span>
                  <span className="font-mono text-right">{currentFile.mime_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span>{formatFileSize(currentFile.file_size)}</span>
                </div>
                {fileWithBlob?.blob && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loaded:</span>
                    <span>{formatFileSize(fileWithBlob.blob.size)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hash:</span>
                  <span className="font-mono text-xs">
                    {currentFile.file_hash.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </InfoSection>
          )}

          {/* Document Metadata */}
          <InfoSection 
            title="Metadata" 
            icon={<Calendar className="h-4 w-4" />}
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(document.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated:</span>
                <span>{formatDate(document.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Document ID:</span>
                <span className="font-mono text-right">{document.id.substring(0, 8)}...</span>
              </div>
              {document.user_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-right">{document.user_id.substring(0, 8)}...</span>
                </div>
              )}
            </div>
          </InfoSection>

          {/* Viewport Info */}
          <InfoSection 
            title="Viewport" 
            icon={<Target className="h-4 w-4" />}
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Document Size:</span>
                <span>{documentSize.width} × {documentSize.height}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scaled Size:</span>
                <span>
                  {Math.round(documentSize.width * zoom)} × {Math.round(documentSize.height * zoom)}px
                </span>
              </div>
            </div>
          </InfoSection>

          {/* Quick Actions */}
          <div className="pt-2">
            <Separator className="mb-3" />
            <div className="flex justify-center">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onToggleVisibility}
                className="text-xs"
              >
                Hide Info Panel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
