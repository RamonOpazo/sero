import { cn } from "@/lib/utils";
import { WidgetContainer, Widget } from "@/components/shared/Widget";
import type { MinimalDocumentType } from "@/types";
import {
  DocumentControls,
  SelectionCommander,
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
      accordion
      accordionDefaultValue="document-controls"
      className={cn(className)} 
      {...props}
    >
      {/* Document Controls */}
      <Widget
        value="document-controls"
        title="Document Controls"
      >
        <DocumentControls document={document} />
      </Widget>

      {/* Selection Management */}
      <Widget
        value="selections"
        title="Selection Management"
      >
        <SelectionCommander document={document} />
        <div className="mt-4">
          <SelectionsList />
        </div>
      </Widget>

      {/* AI Prompts */}
      <Widget
        value="prompts"
        title="AI Prompts"
      >
        <PromptsList documentId={document.id} />
      </Widget>

    </WidgetContainer>
  );
}
