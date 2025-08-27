import React, { useState, useCallback } from 'react';
import { cn } from "@/lib/utils";
import UnifiedViewport from "../viewport/unified-viewport";
import RenderLayer from "../viewport/render-layer";
import SelectionsLayer from "../viewport/selections-layer"; // Note: Will be renamed from SelectionsLayerNew
import InfoLayer from "../viewport/info-layer";
import SelectionsPanelLayer from "../viewport/selections-panel-layer";
import PromptPanelLayer from "../viewport/prompt-panel-layer";
import ActionsLayer from "../viewport/actions-layer";
import { KeyboardShortcutsDialog } from "../dialogs";
import { useViewportState, useViewportActions } from '../../providers/viewport-provider';
import type { MinimalDocumentType } from "@/types";

interface RendererLayoutProps {
  document: MinimalDocumentType;
  className?: string;
}

/**
 * Layout component for the document renderer
 * Manages the composition of rendering layers, viewport, and overlays
 * This replaces the old Layers.tsx with better naming and organization
 */
export default function ViewportLayout({ document, className, ...props }: RendererLayoutProps & React.ComponentProps<"div">) {
  const [documentSize, setDocumentSize] = useState({ width: 800, height: 600 });
  const { showInfoPanel, showSelectionsPanel, showPromptPanel, showHelpOverlay } = useViewportState();
  const { toggleInfoPanel, toggleSelectionsPanel, togglePromptPanel, toggleHelpOverlay } = useViewportActions();

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
      <UnifiedViewport documentSize={documentSize}>
        <RenderLayer 
          document={document} 
          onDocumentSizeChange={handleDocumentSizeChange}
        />
        <SelectionsLayer 
          documentSize={documentSize}
        />
      </UnifiedViewport>

      {/* Actions layer stays outside unified transform for fixed positioning */}
      <ActionsLayer 
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

      {/* Selections panel layer on the left side */}
      <SelectionsPanelLayer 
        document={document}
        isVisible={showSelectionsPanel}
        onToggleVisibility={toggleSelectionsPanel}
      />

      {/* Prompt panel layer on the left side (mutually exclusive) */}
      <PromptPanelLayer 
        document={document}
        isVisible={showPromptPanel}
        onToggleVisibility={togglePromptPanel}
      />
      
      {/* Keyboard shortcuts dialog */}
      <KeyboardShortcutsDialog 
        isVisible={showHelpOverlay}
        onToggleVisibility={toggleHelpOverlay}
      />
    </div>
  );
}
