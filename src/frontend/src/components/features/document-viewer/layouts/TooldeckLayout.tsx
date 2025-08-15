import { cn } from "@/lib/utils";
import { WidgetContainer } from "@/components/shared/Widget";
import type { MinimalDocumentType } from "@/types";
import {
  DocumentStatusBadge,
  ToggleCommander,
  SelectionCommander,
  FileCommander,
  SelectionsList,
  PromptsList,
} from "../tooldeck";

interface ControlsLayoutProps {
  document: MinimalDocumentType;
  className?: string;
}

/**
 * Main layout component for the document viewer controls sidebar
 * Orchestrates all control widgets and manages their layout
 * This replaces the old Controls.tsx with better separation of concerns
 */
export default function ControlsLayout({ document, className, ...props }: ControlsLayoutProps & React.ComponentProps<"div">) {
  return (
    <WidgetContainer
      data-slot="document-viewer-controller"
      expanded
      className={cn(
        "gap-2 p-2",
        className
      )} 
      {...props}
    >
      {/* Document Status Badge */}
      <DocumentStatusBadge />

      {/* Document View Controls */}
      <ToggleCommander />

      {/* Selection Controls */}
      <SelectionCommander document={document} />

      {/* Selection List Widget */}
      <SelectionsList />

      {/* Document Actions */}
      <FileCommander document={document} />

      {/* Prompts Widget */}
      <PromptsList documentId={document.id} />
    </WidgetContainer>
  );
}
