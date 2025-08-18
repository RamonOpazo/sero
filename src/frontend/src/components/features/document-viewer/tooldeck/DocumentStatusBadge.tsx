import { Badge } from "@/components/ui/badge";
import { useViewportState } from "../core/ViewportState";

/**
 * Document status badge component
 * Shows whether the user is viewing the original or redacted version
 */
export default function DocumentStatusBadge() {
  const { isViewingProcessedDocument } = useViewportState();

  return (
    <Badge 
      variant={isViewingProcessedDocument ? "destructive" : "secondary"} 
      className="text-xs w-fit mx-4"
    >
      {isViewingProcessedDocument ? "Redacted" : "Original"}
    </Badge>
  );
}
