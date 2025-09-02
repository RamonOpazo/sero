import { type MinimalDocumentType } from "@/types";
import { WidgetContainer, Widget, WidgetContent } from "@/components/shared/Widget";
import React, { useState, useCallback } from 'react';
import { cn } from "@/lib/utils";
import Viewport from "./unified-viewport";
import RenderLayer from "./render-layer";
import SelectionsLayer from "./selections-layer"; // Note: Will be renamed from SelectionsLayerNew
import InfoLayer from "./info-layer";
import ActionsLayer from "./actions-layer";
import { useViewportState, useViewportActions } from '../providers/viewport-provider';
import { useEffect } from "react";
import { useSelections } from "../providers/selections-provider";
import PromptsListing from "./prompts-listing";
import SelectionsListing from "./selections-listing";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface DocumentViewerLayoutProps {
  document: MinimalDocumentType;
}

export default function DocumentViewerLayout({ document }: DocumentViewerLayoutProps) {
  return (
    <WidgetContainer expanded className="flex-row">
      {/* Main renderer area */}
      <Widget expanded orthocentered className="relative p-0">
        <WidgetContent expanded className="p-0">
          <EditorLayout document={document} />
        </WidgetContent>
      </Widget>

      {/* Controls sidebar */}
      <ListingsLayout document={document} className="max-w-(--sidebar-width)"/>
    </WidgetContainer>
  );
}


interface EditorLayoutProps {
  document: MinimalDocumentType;
  className?: string;
}

export function EditorLayout({ document, className, ...props }: EditorLayoutProps & React.ComponentProps<"div">) {
  const [documentSize, setDocumentSize] = useState({ width: 800, height: 600 });
  const { showInfoPanel } = useViewportState();
  const { toggleInfoPanel } = useViewportActions();

  const handleDocumentSizeChange = useCallback((size: { width: number; height: number }) => {
    setDocumentSize(size);
  }, []);

  return (
    <div
      data-slot="document-viewer-renderer"
      className={cn(
        "flex flex-1 relative h-full w-full justify-center items-center overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Main viewport with document and selections */}
      <Viewport>
        <RenderLayer 
          document={document} 
          onDocumentSizeChange={handleDocumentSizeChange}
        />
        <SelectionsLayer 
          documentSize={documentSize}
        />
      </Viewport>

      {/* Actions layer stays outside unified transform for fixed positioning */}
      <ActionsLayer 
        document={document}
        isInfoVisible={showInfoPanel}
        onToggleInfo={toggleInfoPanel}
      />
      
      {/* Info layer covers the entire viewer area */}
      <InfoLayer 
        document={document} 
        documentSize={documentSize}
        isVisible={showInfoPanel}
        onToggleVisibility={toggleInfoPanel}
      />
    </div>
  );
}

interface ListingsLayoutProps {
  document: MinimalDocumentType;
  className?: string;
}

export function ListingsLayout({ document }: ListingsLayoutProps) {
  const { selectedSelection } = useSelections();

  // Viewport state for orchestration
  const {
    activeWorkbenchTab,
    setActiveWorkbenchTab,
  } = (useViewportState() as any);

  // Auto-switch to Selections tab when a selection is made (one-shot)
  // Important: only run when the selected selection changes, not when tabs change
  useEffect(() => {
    if (selectedSelection) {
      setActiveWorkbenchTab('selections');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSelection?.id]);

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
            <SelectionsListing />
          </div>
        </TabsContent>
        <TabsContent value="prompts">
          <div className="flex-1 min-h-0">
            <PromptsListing documentId={document.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
