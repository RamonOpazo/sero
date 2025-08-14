import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import type { MinimalDocumentType, SelectionCreateType } from "@/types";
import { useViewerState } from '../hooks/useViewerState';

type Props = { 
  document: MinimalDocumentType;
  documentSize: { width: number; height: number };
};

export default function SelectionsLayer({ document, documentSize }: Props) {
  const {
    pageRefs,
    isRendered,
    mode,
    showSelections,
    screenToDocument,
    newSelections,
    drawing,
    isDrawing,
    startSelection,
    updateSelection,
    endSelection,
    deleteSelection,
  } = useViewerState();

  // Event handling is now managed by UnifiedEventHandler
  // This layer only handles rendering

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
            onClick={() => deleteSelection(key as number)}
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
  // Note: MinimalDocumentType doesn't include selections - they're fetched on-demand by components that need them
  const pageExisting: SelectionCreateType[] = []; // TODO: fetch selections if needed for visual overlay
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
        {/* Existing selections - currently not loaded in MinimalDocumentType */}
        {pageExisting.map((sel, i) => renderBox(sel, false, `existing-${i}`))}
        
        {/* New selections */}
        {pageNew.map((sel, i) => renderBox(sel, true, `new-${i}`))}
        
        {/* Currently drawing selection */}
        {drawingThisPage && renderBox(drawingThisPage, true, "drawing", false)}
      </div>

      {/* No interaction layer needed - handled by UnifiedEventHandler */}
    </>
  );
}
