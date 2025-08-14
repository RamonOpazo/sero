import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, FileText, FileWarning, Trash2, Download } from "lucide-react";
import SelectionList from "./SelectionsList";
import PromptList from "./PromptsList";
import type { MinimalDocumentType } from "@/types";
import { useViewerState } from "./hooks/useViewerState";
type Props = { document: MinimalDocumentType };

export default function Controller({ document, className, ...props }: Props & React.ComponentProps<"div">) {
  const { navigation, dispatch } = useViewerState();
  const { isViewingProcessedDocument } = navigation;
  
  const setIsViewingProcessedDocument = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isViewingProcessedDocument) : value;
    dispatch({ type: 'SET_VIEWING_PROCESSED', payload: newValue });
  };
  
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
    <div
      data-slot="document-viewer-controller"
      className={cn(
        "flex flex-1 flex-col gap-4 relative h-full w-full overflow-hidden",
        className
      )} {...props}
    >
      <Badge>{isViewingProcessedDocument ? "Redacted" : "Original"}</Badge>
      <div className="flex flex-col gap-2">
        <h4 className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md text-xs font-medium">Document View</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsViewingProcessedDocument(prev => !prev)}
        >
          {isViewingProcessedDocument ? <><FileText /> Toggle View</> : <><FileWarning /> Toggle View</>}
        </Button>

        <h4 className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md text-xs font-medium">Document Actions</h4>
        <Button variant="outline" size="sm" disabled={isViewingProcessedDocument}>
          <Brain /> Redact File
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadFile}>
          <Download /> Download File
        </Button>
        <Button variant="destructive" size="sm">
          <Trash2 /> Delete File
        </Button>

        <SelectionList documentId={document.id} />

        <PromptList documentId={document.id} />
      </div>
    </div>
  );
}
