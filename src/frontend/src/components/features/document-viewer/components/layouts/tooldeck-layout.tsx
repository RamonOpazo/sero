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

  // Viewport panel state setters
  const { setShowInfoPanel, setShowSelections, setShowSelectionsPanel, setShowPromptPanel } = (useViewportState() as any);

  // Handle panel changes explicitly to avoid fighting user toggles (ESC)
  const handleActivePanelChange = (value: string) => {
    setActivePanel(value);
    setShowInfoPanel(value === 'document-controls');
    setShowSelectionsPanel(value === 'selections');
    setShowPromptPanel(value === 'prompts');
    if (value === 'selections') {
      // Ensure visual selections on the canvas when managing them
      setShowSelections((prev: boolean) => prev || true);
    }
  };

  // Auto-switch to selections tool when a selection is made (one-shot)
  useEffect(() => {
    if (selectedSelection && activePanel !== 'selections') {
      handleActivePanelChange('selections');
    }
  }, [selectedSelection]);
  
  // Initialize default panel state on mount
  useEffect(() => {
    handleActivePanelChange(activePanel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <WidgetContainer
      data-slot="document-viewer-controller"
      expanded
      accordion
      value={activePanel}
      onValueChange={handleActivePanelChange}
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
