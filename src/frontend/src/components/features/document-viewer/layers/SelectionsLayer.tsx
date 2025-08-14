import React, { useRef, useCallback, useEffect, useState } from 'react';
import { usePDFContext } from "@/context/PDFContext";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";
import { useSelection } from "@/hooks/useSelections";
import { cn } from "@/lib/utils";
import type { DocumentType, SelectionCreateType } from "@/types";
import { useViewportContext } from '../core/UnifiedViewport';

type Props = { 
  document: DocumentType;
  documentSize: { width: number; height: number };
};

export default function SelectionsLayer({ document, documentSize }: Props) {
  const { pageRefs, isRendered } = usePDFContext();
  const { mode, showSelections } = useDocumentViewerContext();
  const { screenToDocument } = useViewportContext();
  
  const {
    newSelections,
    drawing,
    startDraw,
    updateDraw,
    endDraw,
    deleteNewSelection,
  } = useSelection(document.id);

  const [isDrawing, setIsDrawing] = useState(false);
  const drawStartRef = useRef<{ pageIndex: number; startPoint: { x: number; y: number } } | null>(null);

  // Handle selection drawing with unified coordinates
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== "select") return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Find which page was clicked
    const pageIndex = 0; // For now, assume single page. TODO: Multi-page support
    const pageRef = pageRefs.current.get(pageIndex);
    if (!pageRef) return;

    // Convert screen coordinates to document coordinates
    const documentPoint = screenToDocument({ x: e.clientX, y: e.clientY }, documentSize);
    if (!documentPoint) return;

    drawStartRef.current = { pageIndex, startPoint: documentPoint };
    setIsDrawing(true);
    
    // Start the selection drawing
    startDraw(e, pageIndex, pageRef);
  }, [mode, screenToDocument, documentSize, pageRefs, startDraw]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode !== "select" || !isDrawing || !drawStartRef.current) return;
    
    e.preventDefault();
    
    const pageRef = pageRefs.current.get(drawStartRef.current.pageIndex);
    if (!pageRef) return;

    // For the selection drawing, we still need to use the page element for relative calculations
    // This maintains compatibility with the existing selection hook
    updateDraw(e, pageRef);
  }, [mode, isDrawing, updateDraw, pageRefs]);

  const handleMouseUp = useCallback(() => {
    if (mode !== "select") return;
    
    setIsDrawing(false);
    drawStartRef.current = null;
    endDraw();
  }, [mode, endDraw]);

  // Render selection boxes using absolute positioning within the unified transform
  const renderBox = (
    sel: SelectionCreateType,
    isNew: boolean,
    key: string | number,
    deletable = true
  ) => {
    // Convert normalized coordinates to pixel coordinates within the document
    const left = sel.x * documentSize.width;
    const top = sel.y * documentSize.height;
    const width = Math.abs(sel.width) * documentSize.width;
    const height = Math.abs(sel.height) * documentSize.height;

    return (
      <div
        key={key}
        className={cn(
          "absolute border-2 pointer-events-auto",
          isNew
            ? "border-green-500 bg-green-300/30"
            : "border-blue-500 bg-blue-300/30"
        )}
        style={{ 
          left: `${Math.min(left, left + sel.width * documentSize.width)}px`,
          top: `${Math.min(top, top + sel.height * documentSize.height)}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {isNew && deletable && (
          <button
            className="absolute -top-1 -right-1 text-xs bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-700"
            onClick={() => deleteNewSelection(key as number)}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  if (!isRendered || !showSelections) {
    return null;
  }

  // Filter selections for current page
  const currentPageNumber = 1; // TODO: Get from context when multi-page support is added
  const pageExisting = document.selections.filter(
    s => s.page_number === currentPageNumber
  );
  const pageNew = newSelections.filter(
    s => s.page_number === currentPageNumber
  );
  const drawingThisPage = drawing?.page_number === currentPageNumber ? drawing : null;

  return (
    <>
      {/* Selection overlay - positioned within the unified transform */}
      <div
        id="__selection_layer__"
        className="absolute inset-0 pointer-events-none"
        style={{
          width: documentSize.width,
          height: documentSize.height,
        }}
      >
        {/* Existing selections */}
        {pageExisting.map((sel, i) => renderBox(sel, false, `existing-${i}`))}
        
        {/* New selections */}
        {pageNew.map((sel, i) => renderBox(sel, true, `new-${i}`))}
        
        {/* Currently drawing selection */}
        {drawingThisPage && renderBox(drawingThisPage, true, "drawing", false)}
      </div>

      {/* Interaction layer - covers the entire viewport for mouse events */}
      <div
        className={cn(
          "absolute inset-0 z-10",
          mode === "select" ? "cursor-crosshair" : "pointer-events-none"
        )}
        style={{
          width: documentSize.width,
          height: documentSize.height,
          pointerEvents: mode === "select" ? "auto" : "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </>
  );
}
