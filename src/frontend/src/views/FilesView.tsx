import { useParams } from "react-router-dom";
import DocumentViewer from "@/components/features/document-viewer/DocumentViewer";
import { useFile } from "./useFile";
import { Loader } from "lucide-react";
import { PasswordDialog } from '@/components/dialogs/PasswordDialog'

export function FilesView() {
  const { documentId } = useParams<{ documentId: string }>();
  const { file, setFileId, loading, error } = useFile();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader className="animate-spin mr-2" />
        Loading document...
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center text-red-500">
        Unable to load document. Please try again later.
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <DocumentViewer document={document} />
    </div>
  );
}
