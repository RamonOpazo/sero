import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { SelectionCreateType } from "@/types";
import { useViewerState } from '../hooks/useViewerState';

type Props = { 
  documentSize: { width: number; height: number };
};

export default function SelectionsLayer({ documentSize }: Props) {
  const {
    isRendered,
    showSelections,
    existingSelections,
    newSelections,
    drawing,
    deleteSelection,
    currentPage,
  } = useViewerState();

  // State for selection editing
  const [selectedSelection, setSelectedSelection] = useState<{
    type: 'existing' | 'new';
    index: number;
    selection: SelectionCreateType;
  } | null>(null);

  // State for resize dragging
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    corner: string;
    initialSelection: SelectionCreateType;
    startMousePos: { x: number; y: number };
  } | null>(null);

  const isDraggingRef = useRef(false);

  // Handle selection click
  const handleSelectionClick = (
    sel: SelectionCreateType,
    type: 'existing' | 'new',
    index: number
  ) => {
    setSelectedSelection({ type, index, selection: sel });
  };

  // Handle resize handle drag start
  const handleResizeStart = useCallback((corner: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!selectedSelection) return;
    
    const startMousePos = { x: e.clientX, y: e.clientY };
    setResizeState({
      isResizing: true,
      corner,
      initialSelection: { ...selectedSelection.selection },
      startMousePos
    });
    
    isDraggingRef.current = true;
  }, [selectedSelection]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState || !selectedSelection || !isDraggingRef.current) return;
    
    const { corner, initialSelection, startMousePos } = resizeState;
    
    // Calculate mouse movement in document coordinates
    const deltaX = (e.clientX - startMousePos.x) / documentSize.width;
    const deltaY = (e.clientY - startMousePos.y) / documentSize.height;
    
    let newSelection = { ...initialSelection };
    
    // Apply resize based on corner being dragged
    switch (corner) {
      case 'nw': // Northwest: move top-left corner
        newSelection.x = initialSelection.x + deltaX;
        newSelection.y = initialSelection.y + deltaY;
        newSelection.width = initialSelection.width - deltaX;
        newSelection.height = initialSelection.height - deltaY;
        break;
      case 'ne': // Northeast: move top-right corner
        newSelection.y = initialSelection.y + deltaY;
        newSelection.width = initialSelection.width + deltaX;
        newSelection.height = initialSelection.height - deltaY;
        break;
      case 'sw': // Southwest: move bottom-left corner
        newSelection.x = initialSelection.x + deltaX;
        newSelection.width = initialSelection.width - deltaX;
        newSelection.height = initialSelection.height + deltaY;
        break;
      case 'se': // Southeast: move bottom-right corner
        newSelection.width = initialSelection.width + deltaX;
        newSelection.height = initialSelection.height + deltaY;
        break;
    }
    
    // Ensure selection stays within bounds (0-1) and has minimum size
    const minSize = 0.01; // 1% minimum size
    newSelection.x = Math.max(0, Math.min(1 - minSize, newSelection.x));
    newSelection.y = Math.max(0, Math.min(1 - minSize, newSelection.y));
    newSelection.width = Math.max(minSize, Math.min(1 - newSelection.x, newSelection.width));
    newSelection.height = Math.max(minSize, Math.min(1 - newSelection.y, newSelection.height));
    
    // Update the selected selection
    setSelectedSelection(prev => prev ? {
      ...prev,
      selection: newSelection
    } : null);
    
    // TODO: Update the actual selection in the state (existing or new)
    // This would require dispatching to the viewer state
    
  }, [resizeState, selectedSelection, documentSize]);

  // Handle mouse up to end resize
  const handleMouseUp = useCallback(() => {
    if (resizeState && selectedSelection) {
      // TODO: Save the resized selection to the appropriate state/database
      console.log('Resize completed:', selectedSelection.selection);
    }
    
    setResizeState(null);
    isDraggingRef.current = false;
  }, [resizeState, selectedSelection]);

  // Set up global mouse event listeners for dragging
  React.useEffect(() => {
    if (resizeState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeState, handleMouseMove, handleMouseUp]);

  // Render resize handles
  const renderResizeHandles = () => {
    if (!selectedSelection) return null;

    const handleSize = 10; // Increased size for better accessibility
    const positions = [
      { name: 'nw', style: { top: -handleSize/2, left: -handleSize/2, cursor: 'nw-resize' } },
      { name: 'ne', style: { top: -handleSize/2, right: -handleSize/2, cursor: 'ne-resize' } },
      { name: 'sw', style: { bottom: -handleSize/2, left: -handleSize/2, cursor: 'sw-resize' } },
      { name: 'se', style: { bottom: -handleSize/2, right: -handleSize/2, cursor: 'se-resize' } },
    ];

    return positions.map(({ name, style }) => (
      <div
        key={name}
        className="absolute bg-blue-600 border border-white shadow-md hover:bg-blue-700 transition-colors"
        style={{
          width: handleSize,
          height: handleSize,
          ...style,
        }}
        onMouseDown={(e) => handleResizeStart(name, e)}
      />
    ));
  };

  // Render selection boxes using absolute positioning within the unified transform
  const renderBox = (
    sel: SelectionCreateType,
    isNew: boolean,
    key: string | number,
    index: number,
    deletable = true
  ) => {
    // Convert normalized coordinates to pixel coordinates within the document
    const left = sel.x * documentSize.width;
    const top = sel.y * documentSize.height;
    const width = Math.abs(sel.width) * documentSize.width;
    const height = Math.abs(sel.height) * documentSize.height;

    const isSelected = selectedSelection?.type === (isNew ? 'new' : 'existing') && 
                      selectedSelection?.index === index;

    return (
      <div
        key={key}
        className={cn(
          "absolute pointer-events-auto group transition-all duration-200",
          isSelected
            ? "border border-blue-600 bg-blue-100/20"
            : isNew
              ? "border border-green-400/60 bg-green-50/10 hover:border-green-500/80"
              : "border border-slate-400/60 bg-slate-50/10 hover:border-slate-500/80"
        )}
        style={{ 
          left: `${Math.min(left, left + sel.width * documentSize.width)}px`,
          top: `${Math.min(top, top + sel.height * documentSize.height)}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectionClick(sel, isNew ? 'new' : 'existing', index);
        }}
      >
        {/* Delete button for new selections */}
        {isNew && deletable && (
          <button
            className="absolute -top-2 -right-2 text-xs bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              deleteSelection(index);
            }}
          >
            ×
          </button>
        )}
        
        {/* Resize handles for selected selection */}
        {isSelected && renderResizeHandles()}
      </div>
    );
  };

  // Filter selections for current page
  // Convert from 0-based currentPage to 1-based page_number for comparison
  const currentPageNumber = currentPage + 1;
  
  // Filter existing selections: show if page_number is null/0 (all pages) or matches current page
  const pageExisting = existingSelections.filter(
    s => s.page_number === null || s.page_number === 0 || s.page_number === currentPageNumber
  );
  
  // Filter new selections: show if page_number is null/0 (all pages) or matches current page  
  const pageNew = newSelections.filter(
    s => s.page_number === null || s.page_number === 0 || s.page_number === currentPageNumber
  );
  
  // Drawing selection: show if page_number is null/0 (all pages) or matches current page
  const drawingThisPage = drawing && (drawing.page_number === null || drawing.page_number === 0 || drawing.page_number === currentPageNumber) ? drawing : null;

  if (!isRendered || !showSelections) {
    return null;
  }

  return (
    <>
      {/* Selection overlay - positioned within the unified transform */}
      <div
        id="__selection_layer__"
        className="absolute inset-0 pointer-events-auto"
        style={{
          width: documentSize.width,
          height: documentSize.height,
        }}
        onClick={() => setSelectedSelection(null)}
      >
        {/* Existing selections from database */}
        {pageExisting.map((sel, i) => renderBox(sel, false, `existing-${i}`, i))}
        
        {/* New selections */}
        {pageNew.map((sel, i) => renderBox(sel, true, `new-${i}`, i))}
        
        {/* Currently drawing selection */}
        {drawingThisPage && renderBox(drawingThisPage, true, "drawing", -1, false)}
      </div>

      {/* No interaction layer needed - handled by UnifiedEventHandler */}
    </>
  );
}
