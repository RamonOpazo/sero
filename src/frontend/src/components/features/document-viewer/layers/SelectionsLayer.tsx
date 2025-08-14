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
    dispatch,
    document: currentDocument,
    mode,
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

  // State for move dragging
  const [moveState, setMoveState] = useState<{
    isMoving: boolean;
    initialSelection: SelectionCreateType;
    startMousePos: { x: number; y: number };
  } | null>(null);

  // State for creating new selection by dragging on empty space
  const [creatingState, setCreatingState] = useState<{
    isCreating: boolean;
    startPoint: { x: number; y: number };
    startMousePos: { x: number; y: number };
  } | null>(null);

  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Handle selection click
  const handleSelectionClick = (
    sel: SelectionCreateType,
    type: 'existing' | 'new',
    index: number
  ) => {
    setSelectedSelection({ type, index, selection: sel });
  };

  // Handle move drag start
  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!selectedSelection) return;
    
    const startMousePos = { x: e.clientX, y: e.clientY };
    setMoveState({
      isMoving: true,
      initialSelection: { ...selectedSelection.selection },
      startMousePos
    });
    
    isDraggingRef.current = true;
  }, [selectedSelection]);

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

  // Handle starting new selection creation on empty space
  const handleCreateStart = useCallback((e: React.MouseEvent) => {
    // Only allow creation in select mode
    if (mode !== 'select' || !currentDocument) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    // Calculate normalized document coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / documentSize.width;
    const y = (e.clientY - rect.top) / documentSize.height;
    
    // Start creating new selection
    const startMousePos = { x: e.clientX, y: e.clientY };
    const startPoint = { x, y };
    
    setCreatingState({
      isCreating: true,
      startPoint,
      startMousePos
    });
    
    // Start the drawing selection in the viewer state
    const initialSelection: SelectionCreateType = {
      x,
      y,
      width: 0,
      height: 0,
      page_number: currentPage + 1,
      document_id: currentDocument.id,
    };
    
    dispatch({ type: 'START_SELECTION', payload: initialSelection });
    isDraggingRef.current = true;
    
    // Clear any selected selection
    setSelectedSelection(null);
  }, [mode, currentDocument, documentSize, currentPage, dispatch]);

  // Handle mouse move during resize, move, or creation
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    if (creatingState) {
      // Handle creating new selection
      const { startPoint, startMousePos } = creatingState;
      
      // Calculate current position in document coordinates
      const deltaX = (e.clientX - startMousePos.x) / documentSize.width;
      const deltaY = (e.clientY - startMousePos.y) / documentSize.height;
      
      const currentX = startPoint.x + deltaX;
      const currentY = startPoint.y + deltaY;
      
      // Create selection from start point to current point
      const newSelection: SelectionCreateType = {
        x: Math.min(startPoint.x, currentX),
        y: Math.min(startPoint.y, currentY),
        width: Math.abs(currentX - startPoint.x),
        height: Math.abs(currentY - startPoint.y),
        page_number: currentPage + 1,
        document_id: currentDocument!.id,
      };
      
      // Ensure selection stays within bounds (0-1)
      const constrainedSelection = {
        ...newSelection,
        x: Math.max(0, Math.min(1, newSelection.x)),
        y: Math.max(0, Math.min(1, newSelection.y)),
        width: Math.max(0, Math.min(1 - newSelection.x, newSelection.width)),
        height: Math.max(0, Math.min(1 - newSelection.y, newSelection.height)),
      };
      
      // Update the drawing selection
      dispatch({ type: 'UPDATE_SELECTION', payload: constrainedSelection });
      return;
    }
    
    if (!selectedSelection) return;
    
    let newSelection: SelectionCreateType;
    
    if (resizeState) {
      // Handle resize operation
      const { corner, initialSelection, startMousePos } = resizeState;
      
      // Calculate mouse movement in document coordinates
      const deltaX = (e.clientX - startMousePos.x) / documentSize.width;
      const deltaY = (e.clientY - startMousePos.y) / documentSize.height;
      
      newSelection = { ...initialSelection };
      
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
      
    } else if (moveState) {
      // Handle move operation
      const { initialSelection, startMousePos } = moveState;
      
      // Calculate mouse movement in document coordinates
      const deltaX = (e.clientX - startMousePos.x) / documentSize.width;
      const deltaY = (e.clientY - startMousePos.y) / documentSize.height;
      
      newSelection = { ...initialSelection };
      newSelection.x = initialSelection.x + deltaX;
      newSelection.y = initialSelection.y + deltaY;
      
      // Ensure selection stays within bounds (0-1)
      newSelection.x = Math.max(0, Math.min(1 - newSelection.width, newSelection.x));
      newSelection.y = Math.max(0, Math.min(1 - newSelection.height, newSelection.y));
      
    } else {
      return; // No active drag operation
    }
    
    // Update the selected selection
    setSelectedSelection(prev => prev ? {
      ...prev,
      selection: newSelection
    } : null);
    
    // Update the actual selection in the viewer state
    if (selectedSelection.type === 'existing') {
      dispatch({
        type: 'UPDATE_EXISTING_SELECTION',
        payload: { index: selectedSelection.index, selection: newSelection }
      });
    } else {
      dispatch({
        type: 'UPDATE_NEW_SELECTION',
        payload: { index: selectedSelection.index, selection: newSelection }
      });
    }
    
  }, [resizeState, moveState, creatingState, selectedSelection, documentSize, dispatch, currentPage, currentDocument]);

  // Handle mouse up to end resize, move, or creation
  const handleMouseUp = useCallback(() => {
    if (creatingState) {
      // End the selection creation
      dispatch({ type: 'END_SELECTION' });
      console.log('Selection creation completed');
      setCreatingState(null);
    }
    
    if (resizeState && selectedSelection) {
      // TODO: Save the resized selection to the appropriate state/database
      console.log('Resize completed:', selectedSelection.selection);
    }
    
    if (moveState && selectedSelection) {
      // TODO: Save the moved selection to the appropriate state/database
      console.log('Move completed:', selectedSelection.selection);
    }
    
    setResizeState(null);
    setMoveState(null);
    isDraggingRef.current = false;
  }, [creatingState, resizeState, moveState, selectedSelection, dispatch]);

  // Set up global mouse event listeners for dragging
  React.useEffect(() => {
    if (resizeState || moveState || creatingState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Clean up any pending RAF
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [resizeState, moveState, creatingState, handleMouseMove, handleMouseUp]);

  // Clean up RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

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
          "absolute pointer-events-auto group",
          // Disable transitions during resize, move, or creation to prevent lag
          (resizeState || moveState || (creatingState && key === "drawing"))
            ? "" // No transition during resize/move/creation
            : "transition-all duration-200", // Normal transitions when not actively dragging
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
          cursor: isSelected 
            ? moveState?.isMoving 
              ? 'grabbing' 
              : 'grab'
            : 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectionClick(sel, isNew ? 'new' : 'existing', index);
        }}
        onMouseDown={(e) => {
          // Only start move if this selection is selected and we're not clicking on resize handles
          if (isSelected && !e.defaultPrevented) {
            handleMoveStart(e);
          }
        }}
      >
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
          cursor: mode === 'select' ? 'crosshair' : 'default',
        }}
        onClick={() => setSelectedSelection(null)}
        onMouseDown={(e) => {
          // Only handle mouse down on empty space (not on existing selections)
          if (e.target === e.currentTarget && mode === 'select') {
            handleCreateStart(e);
          }
        }}
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
