import { cn } from "@/lib/utils";
import { WidgetContainer, Widget } from "@/components/shared/Widget";
import { useState, useEffect } from "react";
import type { MinimalDocumentType } from "@/types";
import { useSelections } from "../../providers/selection-provider";
import { useViewportState } from "../../providers/viewport-provider";
import {
  DocumentControls,
  SelectionCommander,
  PromptCommander,
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
  const { selectedSelection } = useSelections();
  const [activePanel, setActivePanel] = useState<string>("document-controls");

  // Auto-expand selection panel when a selection is made
  useEffect(() => {
    if (selectedSelection) {
      setActivePanel("selections");
    }
  }, [selectedSelection]);

  // Auto-open panels based on active tooldeck widget
  const { setShowInfoPanel, setShowSelections, setShowSelectionsPanel } = (useViewportState() as any);
  useEffect(() => {
    // Open info panel when Document Controls is active; close it when not
    setShowInfoPanel(activePanel === 'document-controls');
    // Open selections panel when Selection Manager is active; close it otherwise
    setShowSelectionsPanel(activePanel === 'selections');
    if (activePanel === 'selections') {
      // Ensure visual selections on the canvas when managing them
      setShowSelections((prev: boolean) => prev || true);
    }
  }, [activePanel, setShowInfoPanel, setShowSelectionsPanel, setShowSelections]);
  
  return (
    <WidgetContainer
      data-slot="document-viewer-controller"
      expanded
      accordion
      value={activePanel}
      onValueChange={setActivePanel}
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
      </Widget>

      {/* AI Prompts */}
      <Widget
        value="prompts"
        title="AI Prompts"
      >
        <PromptCommander document={document} />
      </Widget>

    </WidgetContainer>
  );
}
