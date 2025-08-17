import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Trash2, FileText, Eye, EyeOff } from "lucide-react";
import { useViewportState } from "../core/ViewportState";
import type { MinimalDocumentType } from "@/types";

interface DocumentControlsProps {
  document: MinimalDocumentType;
}

/**
 * Consolidated document controls component
 * Combines view switching, file information, and processing operations
 */
export default function DocumentControls({ document }: DocumentControlsProps) {
  const { isViewingProcessedDocument, dispatch } = useViewportState();

  const toggleDocumentView = () => {
    dispatch({ 
      type: 'SET_VIEWING_PROCESSED', 
      payload: !isViewingProcessedDocument 
    });
  };

  const handleDownloadFile = () => {
    const currentFile = isViewingProcessedDocument ? document.redacted_file : document.original_file;
    if (currentFile && document.files) {
      const fileWithBlob = document.files.find(f => f.id === currentFile.id);
      if (fileWithBlob && 'blob' in fileWithBlob && fileWithBlob.blob instanceof Blob) {
        const url = URL.createObjectURL(fileWithBlob.blob);
        const link = globalThis.document.createElement('a');
        link.href = url;
        link.download = `${document.name}_${isViewingProcessedDocument ? 'redacted' : 'original'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const currentFile = isViewingProcessedDocument ? document.redacted_file : document.original_file;
  const hasRedactedFile = document.redacted_file !== null;

  return (
    <div className="space-y-4">
      {/* Document Information */}
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="text-xs font-medium truncate" title={document.name}>
            {document.name}
          </div>
          {document.description && (
            <div className="text-xs text-muted-foreground truncate" title={document.description}>
              {document.description}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Current View</span>
          <Badge 
            variant={isViewingProcessedDocument ? "destructive" : "secondary"}
            className="text-xs"
          >
            {isViewingProcessedDocument ? "Redacted" : "Original"}
          </Badge>
        </div>
        
        {currentFile && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>File Size:</span>
              <span className="font-mono">{formatFileSize(currentFile.file_size)}</span>
            </div>
          </div>
        )}
        
        {document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {document.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
            {document.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{document.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* View Controls */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDocumentView}
          disabled={!hasRedactedFile && !isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          {isViewingProcessedDocument ? 
            <FileText className="mr-2 h-3 w-3" /> : 
            <Eye className="mr-2 h-3 w-3" />
          }
          View {isViewingProcessedDocument ? 'Original' : 'Redacted'}
          {!hasRedactedFile && !isViewingProcessedDocument && (
            <span className="ml-auto text-muted-foreground">(Not available)</span>
          )}
        </Button>
      </div>

      {/* Processing Actions */}
      <div className="space-y-2">
        <Button 
          variant="default" 
          size="sm" 
          disabled={isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          <Play className="mr-2 h-3 w-3" />
          Process Document
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownloadFile}
          disabled={!currentFile}
          className="w-full justify-start h-9 text-xs"
        >
          <Download className="mr-2 h-3 w-3" />
          Download {isViewingProcessedDocument ? 'Redacted' : 'Original'}
        </Button>
      </div>
      
      {/* Danger Zone */}
      <div className="pt-2 border-t border-border/50">
        <Button 
          variant="destructive" 
          size="sm"
          className="w-full justify-start h-9 text-xs"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Delete Document
        </Button>
      </div>
    </div>
  );
}
