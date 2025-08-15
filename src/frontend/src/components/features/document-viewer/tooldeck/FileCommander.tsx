import { Button } from "@/components/ui/button";
import { Widget, WidgetHeader, WidgetTitle, WidgetBody } from "@/components/shared/Widget";
import { Brain, Download, Trash2 } from "lucide-react";
import { useViewportState } from "../core/ViewportState";
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
        link.download = `${document.name}_${isViewingProcessedDocument ? 'redacted' : 'original'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <Widget className="py-2">
      <WidgetHeader className="pb-1">
        <WidgetTitle className="text-xs flex items-center gap-1">
          <Brain className="h-3 w-3" />
          Actions
        </WidgetTitle>
      </WidgetHeader>
      <WidgetBody className="pt-0">
        <div className="space-y-1">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isViewingProcessedDocument}
            className="w-full justify-start h-8 text-xs"
          >
            <Brain className="mr-2 h-3 w-3" />
            Redact File
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadFile}
            className="w-full justify-start h-8 text-xs"
          >
            <Download className="mr-2 h-3 w-3" />
            Download File
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            className="w-full justify-start h-8 text-xs"
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete File
          </Button>
        </div>
      </WidgetBody>
    </Widget>
  );
}
