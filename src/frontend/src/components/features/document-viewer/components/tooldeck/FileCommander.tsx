import { Button } from "@/components/ui/button";
import { Brain, Download, Trash2 } from "lucide-react";
import { useViewportState } from "../../providers/viewport-provider";
import type { MinimalDocumentType } from "@/types";

interface DocumentActionsProps {
  document: MinimalDocumentType;
}

/**
 * Document actions component
 * Provides actions for document operations like redaction, download, and deletion
 */
export default function DocumentActions({ document }: DocumentActionsProps) {
  const { isViewingProcessedDocument } = useViewportState();

  const handleDownloadFile = () => {
    // Simple download using the blob from the document
    const currentFile = isViewingProcessedDocument ? document.redacted_file : document.original_file;
    if (currentFile && document.files) {
      const fileWithBlob = document.files.find(f => f.id === currentFile.id);
      if (fileWithBlob && 'blob' in fileWithBlob && fileWithBlob.blob instanceof Blob) {
        const url = URL.createObjectURL(fileWithBlob.blob);
        const link = globalThis.document.createElement('a');
        link.href = url;
        // Use document ID for redacted to avoid leaking names
        const fname = isViewingProcessedDocument ? `${document.id}.pdf` : `${document.name}_original.pdf`;
        link.download = fname;
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Processing Actions */}
      <div className="space-y-2">
        <Button 
          variant="default" 
          size="sm" 
          disabled={isViewingProcessedDocument}
          className="w-full justify-start h-9 text-xs"
        >
          <Brain className="mr-2 h-3 w-3" />
          Redact Document
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownloadFile}
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
