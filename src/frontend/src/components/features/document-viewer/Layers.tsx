import React, { useState, useCallback } from 'react';
import { cn } from "@/lib/utils"
import UnifiedViewport from "./core/UnifiedViewport";
import RenderLayer from "./layers/RenderLayer";
import SelectionsLayer from "./layers/SelectionsLayer";
import InfoLayer from "./layers/InfoLayer";
import ActionsLayer from "./ActionsLayer";
import { useViewerState } from './hooks/useViewerState';
import type { MinimalDocumentType } from "@/types";

type Props = { document: MinimalDocumentType };

export default function Renderer({ document, className, ...props }: Props & React.ComponentProps<"div">) {
  const [documentSize, setDocumentSize] = useState({ width: 800, height: 600 });
  const { showInfoPanel, toggleInfoPanel } = useViewerState();

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
    </div>
  );
}
