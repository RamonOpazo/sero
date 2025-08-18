import { Button } from "@/components/ui/button";
import { FileText, FileWarning } from "lucide-react";
import { useViewportState } from "../core/ViewportState";

/**
 * Document view controls component
 * Allows switching between original and redacted document views
 */
export default function DocumentViewControls() {
  const { isViewingProcessedDocument, dispatch } = useViewportState();

  const setIsViewingProcessedDocument = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isViewingProcessedDocument) : value;
    dispatch({ type: 'SET_VIEWING_PROCESSED', payload: newValue });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsViewingProcessedDocument(prev => !prev)}
      className="w-full justify-start h-8 text-xs"
    >
      {isViewingProcessedDocument ? <FileText className="mr-2 h-3 w-3" /> : <FileWarning className="mr-2 h-3 w-3" />}
      {isViewingProcessedDocument ? 'View Original' : 'View Redacted'}
    </Button>
  );
}
