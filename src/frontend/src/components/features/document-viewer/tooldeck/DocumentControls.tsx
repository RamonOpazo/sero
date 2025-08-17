import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Download, Trash2, FileText, Eye, Calendar, Clock } from "lucide-react";
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) !== 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  const currentFile = isViewingProcessedDocument ? document.redacted_file : document.original_file;
  const hasRedactedFile = document.redacted_file !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Document Header */}
      <div className="flex flex-col gap-2">
          <div className="text-sm font-medium truncate" title={document.name}>
            {document.name}
          </div>
          {document.description && (
            <div className="text-xs text-muted-foreground leading-relaxed" title={document.description}>
              {document.description}
            </div>
          )}

        {document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {document.tags.slice(0, 4).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                {tag}
              </Badge>
            ))}
            {document.tags.length > 4 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                +{document.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
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

      <Separator />

      {/* Document Metadata */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Created {formatDate(document.created_at)}</span>
        </div>

        {document.updated_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Updated {formatRelativeTime(document.updated_at)}</span>
          </div>
        )}

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
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>File Size</span>
            <span className="font-mono">{formatFileSize(currentFile.file_size)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Original File</span>
          <Badge variant={document.original_file ? "secondary" : "outline"} className="text-xs">
            {document.original_file ? "Available" : "Missing"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Redacted File</span>
          <Badge variant={hasRedactedFile ? "destructive" : "outline"} className="text-xs">
            {hasRedactedFile ? "Available" : "Pending"}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* View Controls */}
      <div className="flex flex-col gap-2">
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
