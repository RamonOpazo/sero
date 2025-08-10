import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, FileText, FileWarning, Trash2, Download } from "lucide-react";
import SelectionList from "./SelectionsList";
import PromptList from "./PromptsList";
import type { DocumentType } from "@/types";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";
type Props = { document: DocumentType };

export default function Controller({ document, className, ...props }: Props & React.ComponentProps<"div">) {
  const { isViewingProcessedDocument, setIsViewingProcessedDocument } = useDocumentViewerContext();
  
  const handleDownloadFile = () => {
    // Simple download using the blob from the document
    const currentFile = isViewingProcessedDocument ? document.redacted_file : document.original_file;
    if (currentFile && document.files) {
      const fileWithBlob = document.files.find(f => f.id === currentFile.id);
      if (fileWithBlob && 'blob' in fileWithBlob && fileWithBlob.blob instanceof Blob) {
        const url = URL.createObjectURL(fileWithBlob.blob);
        const link = document.createElement('a');
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

        <SelectionList selections={document.selections} />

        <PromptList prompts={document.prompts} />
      </div>
    </div>
  );
}
