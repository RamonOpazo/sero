import { cn } from "@/lib/utils";
import { WidgetContainer, Widget } from "@/components/shared/Widget";
import { useEffect } from "react";
import type { MinimalDocumentType } from "@/types";
import { useSelections } from "../../providers/selection-provider";
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
export default function ControlsLayout({ document, className, ...props }: ControlsLayoutProps & React.ComponentProps<"div">) {
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
  useEffect(() => {
    if (selectedSelection) {
      if (activeControlsPanel !== 'workbench') setActiveControlsPanel('workbench');
      if (activeWorkbenchTab !== 'selections') setActiveWorkbenchTab('selections');
    }
  }, [selectedSelection, activeControlsPanel, activeWorkbenchTab, setActiveControlsPanel, setActiveWorkbenchTab]);

  // Initialize default panel state on mount
  useEffect(() => {
    handleActivePanelChange(activeControlsPanel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="w-[350px]"
    >
      <Tabs value={activeWorkbenchTab} onValueChange={setActiveWorkbenchTab}>
        <TabsList className="bg-transparent">
          <TabsTrigger
            className="border-0 bg-transparent"
            value="selections">Selections</TabsTrigger>
          <TabsTrigger value="prompts">AI Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="selections" className="flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <SelectionList />
          </div>
        </TabsContent>
        <TabsContent value="prompts" className="flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <PromptsList documentId={document.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
    // <WidgetContainer
    //   data-slot="document-viewer-controller"
    //   expanded
    //   accordion
    //   value={activeControlsPanel}
    //   onValueChange={handleActivePanelChange}
    //   className={cn(className)}
    //   {...props}
    // >
    //   <Widget
    //     value="workbench"
    //     title="Workbench"
    //   >
    //     <Tabs value={activeWorkbenchTab} onValueChange={setActiveWorkbenchTab}>
    //       <TabsList>
    //         <TabsTrigger value="selections">Selections</TabsTrigger>
    //         <TabsTrigger value="prompts">AI Rules</TabsTrigger>
    //       </TabsList>

    //       <TabsContent value="selections" className="flex flex-col gap-4">
    //         <div className="flex-1 min-h-0">
    //           <SelectionList />
    //         </div>
    //       </TabsContent>

    //       <TabsContent value="prompts" className="flex flex-col gap-4">
    //         <div className="flex-1 min-h-0">
    //           <PromptsList documentId={document.id} />
    //         </div>
    //       </TabsContent>
    //     </Tabs>
    //   </Widget>

    // </WidgetContainer>
  );
}
