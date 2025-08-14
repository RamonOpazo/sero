import React, { useState, useCallback } from 'react';
import { cn } from "@/lib/utils"
import UnifiedViewport from "./core/UnifiedViewport";
import RenderLayer from "./layers/RenderLayer";
import SelectionsLayer from "./layers/SelectionsLayer";
import InfoLayer from "./layers/InfoLayer";
import ActionsLayer from "./ActionsLayer";
import type { DocumentType } from "@/types";

type Props = { document: DocumentType };

export default function Renderer({ document, className, ...props }: Props & React.ComponentProps<"div">) {
  const [documentSize, setDocumentSize] = useState({ width: 800, height: 600 });
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  const handleDocumentSizeChange = useCallback((size: { width: number; height: number }) => {
    setDocumentSize(size);
  }, []);

  const handleToggleInfo = useCallback(() => {
    setIsInfoVisible(prev => !prev);
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
          document={document} 
          documentSize={documentSize}
        />
        <InfoLayer 
          document={document} 
          documentSize={documentSize}
          isVisible={isInfoVisible}
          onToggleVisibility={handleToggleInfo}
        />
      </UnifiedViewport>
      
      {/* Actions layer stays outside unified transform for fixed positioning */}
      <ActionsLayer 
        isInfoVisible={isInfoVisible}
        onToggleInfo={handleToggleInfo}
      />
    </div>
  );
}
