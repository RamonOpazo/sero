import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDocumentById } from "@/lib/api";
import DocumentViewer from "@/components/features/document-viewer/DocumentViewer";
import { type DocumentType } from "@/types";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export function FilesView() {
  const { documentId } = useParams<{ documentId: string }>();
  const [document, setDocument] = useState<DocumentType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;

    const loadDocument = async () => {
      try {
        const doc = await getDocumentById(documentId);
        setDocument(doc);
      } catch (err) {
        toast.error("Failed to load document", {
          description: "Please refresh the page to try again."
        });
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader className="animate-spin mr-2" />
        Loading document...
      </div>
    );
  }

  if (!document) {
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
