import { useEffect } from "react";
import type { MinimalDocumentType } from "@/types";
import { useSelections } from "../../providers/selections-provider";
import { useViewportState } from "../../providers/viewport-provider";
import { PromptsList } from "../tooldeck";
import SelectionList from "../tooldeck/selection-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ControlsLayoutProps {
  document: MinimalDocumentType;
  className?: string;
}

/**
 * Main layout component for the document viewer controls sidebar
 * Orchestrates all control widgets and manages their layout
 * This replaces the old Controls.tsx with better separation of concerns
 */
export default function ControlsLayout({ document }: ControlsLayoutProps) {
  const { selectedSelection } = useSelections();

  // Viewport state for orchestration
  const {
    setShowInfoPanel,
    setShowSelections,
    setShowSelectionsPanel,
    setShowPromptPanel,
    activeControlsPanel,
    setActiveControlsPanel,
    activeWorkbenchTab,
    setActiveWorkbenchTab,
  } = (useViewportState() as any);

  const handleActivePanelChange = (value: string) => {
    setActiveControlsPanel(value);
    setShowInfoPanel(value === 'document-controls');
    // Hide legacy overlay panels when using the new tabbed widget
    setShowSelectionsPanel(false);
    setShowPromptPanel(false);
    if (value === 'workbench') {
      // Ensure visual selections on the canvas when managing them
      setShowSelections((prev: boolean) => prev || true);
    }
  };

  // Auto-switch to Selections tab when a selection is made (one-shot)
  // Important: only run when the selected selection changes, not when tabs change
  useEffect(() => {
    if (selectedSelection) {
      setActiveControlsPanel('workbench');
      setActiveWorkbenchTab('selections');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSelection?.id]);

  // Initialize default panel state on mount
  useEffect(() => {
    handleActivePanelChange(activeControlsPanel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-[300px]">
      <Tabs value={activeWorkbenchTab} onValueChange={setActiveWorkbenchTab}>
        <TabsList className="bg-transparent p-0">
          <TabsTrigger
            className="border-0 bg-transparent hover:underline"
            value="selections">Selections</TabsTrigger>
          <TabsTrigger
            className="border-0 bg-transparent hover:underline"
            value="prompts">AI Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="selections">
          <div className="flex-1 min-h-0">
            <SelectionList />
          </div>
        </TabsContent>
        <TabsContent value="prompts">
          <div className="flex-1 min-h-0">
            <PromptsList documentId={document.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
