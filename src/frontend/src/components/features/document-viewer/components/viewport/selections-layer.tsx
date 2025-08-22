/**
 * Simplified SelectionsLayer using the new SelectionManager
 * 
 * This replaces the complex SelectionsLayer with a much cleaner implementation
 * that uses the new SelectionManager for state management.
 */

import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSelections } from '../../providers/selection-provider';
import { useViewportState } from '../../providers/viewport-provider';
import type { Selection, SelectionCreateType } from '../../types/viewer';

type Props = { 
  documentSize: { width: number; height: number };
};

export default function SelectionsLayerNew({ documentSize }: Props) {
  // Viewport state (for non-selection state)
  const {
    isRendered,
    showSelections,
    currentPage,
    mode,
    isViewingProcessedDocument,
    document: currentDocument,
  } = useViewportState();

  // New selection system
  const {
    state: selectionState,
    allSelections,
    selectedSelection,
    selectSelection,
    updateSelectionBatch,
    finishBatchOperation,
    startDraw,
    updateDraw,
    finishDraw,
    onSelectionDoubleClick,
    pendingChanges,
    getCurrentDraw,
    beginBatchOperation,
  } = useSelections();
  
  // Touch selectionState to avoid TS unused variable during builds
  void selectionState;
  
  // Interaction state for resize, move, and create operations
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'create';
    corner?: string;
    startMousePos: { x: number; y: number };
    startPoint?: { x: number; y: number };
    initialSelection?: Selection;
  } | null>(null);

  const isDraggingRef = useRef(false);

  // Track double-click timing
  const lastClickRef = useRef<{ time: number; selectionId: string }>({ time: 0, selectionId: '' });

  // Handle selection click with double-click detection
  const handleSelectionClick = useCallback((selection: Selection) => {
    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 300; // ms
    
    // Check if this is a double-click on the same selection
    if (
      selection.id === lastClickRef.current.selectionId &&
      now - lastClickRef.current.time < DOUBLE_CLICK_DELAY
    ) {
      // Double-click detected - trigger callback if available
      if (onSelectionDoubleClick) {
        onSelectionDoubleClick(selection);
      }
    } else {
      // Single click - select the selection
      selectSelection(selection.id);
    }
    
    // Update last click tracking
    lastClickRef.current = { time: now, selectionId: selection.id };
  }, [selectSelection, onSelectionDoubleClick]);

  // Handle starting new selection creation
  const handleCreateStart = useCallback((e: React.MouseEvent) => {
    if (mode !== 'select' || !currentDocument) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    // Calculate normalized document coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / documentSize.width;
    const y = (e.clientY - rect.top) / documentSize.height;
    
    const startMousePos = { x: e.clientX, y: e.clientY };
    const startPoint = { x, y };
    
    setDragState({
      type: 'create',
      startMousePos,
      startPoint,
    });
    
    // Start drawing in the new selection system
    const initialSelection: SelectionCreateType = {
      x,
      y,
      width: 0,
      height: 0,
      page_number: currentPage,
      document_id: currentDocument.id,
      committed: false,
    };
    
    startDraw(initialSelection);
    isDraggingRef.current = true;
    selectSelection(null); // Clear selection
  }, [mode, currentDocument, documentSize, currentPage, startDraw, selectSelection]);

  // Handle mouse move during drag operations
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !dragState) return;
    
    if (dragState.type === 'create' && dragState.startPoint) {
      // Handle creating new selection - use drawing system
      const { startPoint, startMousePos } = dragState;
      
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
        page_number: currentPage,
        document_id: currentDocument!.id,
        committed: false,
      };
      
      // Ensure selection stays within bounds (0-1)
      const constrainedSelection = {
        ...newSelection,
        x: Math.max(0, Math.min(1, newSelection.x)),
        y: Math.max(0, Math.min(1, newSelection.y)),
        width: Math.max(0, Math.min(1 - newSelection.x, newSelection.width)),
        height: Math.max(0, Math.min(1 - newSelection.y, newSelection.height)),
      };
      
      updateDraw(constrainedSelection);
      
    } else if (dragState.type === 'move' && dragState.initialSelection && selectedSelection) {
      // Handle moving selection - directly update the selection in real-time
      const { startMousePos, initialSelection } = dragState;
      
      const deltaX = (e.clientX - startMousePos.x) / documentSize.width;
      const deltaY = (e.clientY - startMousePos.y) / documentSize.height;
      
      const updatedSelection = {
        ...initialSelection,
        x: Math.max(0, Math.min(1 - initialSelection.width, initialSelection.x + deltaX)),
        y: Math.max(0, Math.min(1 - initialSelection.height, initialSelection.y + deltaY)),
      };
      
      // Use batch update to avoid history spam during drag
      updateSelectionBatch(selectedSelection.id, updatedSelection);
      
    } else if (dragState.type === 'resize' && dragState.initialSelection && dragState.corner && selectedSelection) {
      // Handle resizing selection - directly update the selection in real-time
      const { startMousePos, initialSelection, corner } = dragState;
      
      const deltaX = (e.clientX - startMousePos.x) / documentSize.width;
      const deltaY = (e.clientY - startMousePos.y) / documentSize.height;
      
      let updatedSelection = { ...initialSelection };
      
      // Apply resize based on corner
      switch (corner) {
        case 'nw':
          updatedSelection.x = initialSelection.x + deltaX;
          updatedSelection.y = initialSelection.y + deltaY;
          updatedSelection.width = initialSelection.width - deltaX;
          updatedSelection.height = initialSelection.height - deltaY;
          break;
        case 'ne':
          updatedSelection.y = initialSelection.y + deltaY;
          updatedSelection.width = initialSelection.width + deltaX;
          updatedSelection.height = initialSelection.height - deltaY;
          break;
        case 'sw':
          updatedSelection.x = initialSelection.x + deltaX;
          updatedSelection.width = initialSelection.width - deltaX;
          updatedSelection.height = initialSelection.height + deltaY;
          break;
        case 'se':
          updatedSelection.width = initialSelection.width + deltaX;
          updatedSelection.height = initialSelection.height + deltaY;
          break;
      }
      
      // Ensure minimum size and bounds
      const minSize = 0.01;
      updatedSelection.x = Math.max(0, Math.min(1 - minSize, updatedSelection.x));
      updatedSelection.y = Math.max(0, Math.min(1 - minSize, updatedSelection.y));
      updatedSelection.width = Math.max(minSize, Math.min(1 - updatedSelection.x, updatedSelection.width));
      updatedSelection.height = Math.max(minSize, Math.min(1 - updatedSelection.y, updatedSelection.height));
      
      // Use batch update to avoid history spam during drag
      updateSelectionBatch(selectedSelection.id, updatedSelection);
    }
  }, [dragState, documentSize, currentPage, currentDocument, updateDraw, selectedSelection, updateSelectionBatch]);

  // Handle mouse up to end drag operations
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    if (dragState?.type === 'create') {
      // Only creation uses the drawing system
      finishDraw();
    } else if (dragState?.type === 'move' || dragState?.type === 'resize') {
      // Finish the batch operation to add single history entry
      finishBatchOperation();
    }
    
    setDragState(null);
    isDraggingRef.current = false;
  }, [dragState, finishDraw, finishBatchOperation]);

  // Set up global mouse event listeners for dragging
  React.useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);



  // Handle move start
  const handleMoveStart = useCallback((e: React.MouseEvent, selection: Selection) => {
    if (e.button !== 0) return; // Only left click
    
    e.stopPropagation();
    e.preventDefault();
    
    // Begin a batch so drag updates coalesce into a single history entry
    beginBatchOperation();

    setDragState({
      type: 'move',
      startMousePos: { x: e.clientX, y: e.clientY },
      initialSelection: selection,
    });
    
    isDraggingRef.current = true;
  }, [beginBatchOperation]);
  
  // Handle resize start
  const handleResizeStart = useCallback((corner: string, e: React.MouseEvent, selection: Selection) => {
    if (e.button !== 0) return; // Only left click
    
    e.stopPropagation();
    e.preventDefault();
    
    // Begin a batch so drag updates coalesce into a single history entry
    beginBatchOperation();

    setDragState({
      type: 'resize',
      corner,
      startMousePos: { x: e.clientX, y: e.clientY },
      initialSelection: selection,
    });
    
    isDraggingRef.current = true;
  }, [beginBatchOperation]);

  // Render resize handles
  const renderResizeHandles = useCallback((selection: Selection) => {
    const handleSize = 10;
    const positions = [
      { name: 'nw', style: { top: -handleSize/2, left: -handleSize/2, cursor: 'nw-resize' } },
      { name: 'ne', style: { top: -handleSize/2, right: -handleSize/2, cursor: 'ne-resize' } },
      { name: 'sw', style: { bottom: -handleSize/2, left: -handleSize/2, cursor: 'sw-resize' } },
      { name: 'se', style: { bottom: -handleSize/2, right: -handleSize/2, cursor: 'se-resize' } },
    ];

    return positions.map(({ name, style }) => (
      <div
        key={name}
        className="absolute bg-blue-600 border border-white shadow-md hover:bg-blue-700 transition-colors z-10"
        style={{
          width: handleSize,
          height: handleSize,
          ...style,
        }}
        onMouseDown={(e) => handleResizeStart(name, e, selection)}
      />
    ));
  }, [handleResizeStart]);


  // Render selection box
  const renderSelectionBox = useCallback((selection: Selection) => {
    // Convert normalized coordinates to pixel coordinates
    const left = selection.x * documentSize.width;
    const top = selection.y * documentSize.height;
    const width = Math.abs(selection.width) * documentSize.width;
    const height = Math.abs(selection.height) * documentSize.height;

    const isSelected = selectedSelection?.id === selection.id;
    const isNew = pendingChanges.creates.some((create: Selection) => create.id === selection.id);
    const isGlobal = selection.page_number === null;

    // Check if this saved selection has been modified from its initial state
    const isModified = !isNew && pendingChanges.updates.some((update: Selection) => update.id === selection.id);

    // Choose a color family for border and pattern; also set matching text-* so currentColor can be used in CSS
    const colorClasses = isSelected
      ? { border: "border-blue-600", text: "text-blue-600" }
      : isGlobal
        ? { border: "border-yellow-500/80 hover:border-yellow-600/95", text: "text-yellow-600" }
        : isNew
          ? { border: "border-green-500/80 hover:border-green-600/95", text: "text-green-600" }
          : isModified
            ? { border: "border-purple-600/85 hover:border-purple-700/95", text: "text-purple-700" }
            : { border: "border-slate-500/80 hover:border-slate-600/95", text: "text-slate-600" };

    const selectionElement = (
      <div
        key={selection.id}
        className={cn(
          "absolute pointer-events-auto group overflow-hidden",
          // Disable transitions during drag operations
          dragState?.type === 'move' || dragState?.type === 'resize'
            ? ""
            : "transition-all duration-200",
          "border",
          colorClasses.border,
          colorClasses.text,
        )}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          cursor: isSelected
            ? (dragState?.type === 'move' ? 'grabbing' : 'grab')
            : 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectionClick(selection);
        }}
        onMouseDown={(e) => {
          // Start move if this selection is selected and not clicking resize handles
          if (isSelected && e.button === 0 && !e.defaultPrevented) {
            handleMoveStart(e, selection);
          }
        }}
      >
        {/* Backdrop brightness to gently lift darker areas */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backdropFilter: 'brightness(1.1)',
            WebkitBackdropFilter: 'brightness(1.1)',
            backgroundColor: 'rgba(255,255,255,.40)',
          }}
        />
        {/* Subtle solid tint using currentColor */}
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundColor: 'currentColor' }} />
        {/* Diagonal stripe overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `linear-gradient(135deg, currentColor 2.25%, transparent 2.25%, transparent 50%, currentColor 50%, currentColor 52.25%, transparent 52.25%, transparent 100%)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Resize handles for selected selection */}
        {isSelected && renderResizeHandles(selection)}
      </div>
    );

    return selectionElement;
  }, [documentSize, selectedSelection, handleSelectionClick, dragState, renderResizeHandles, handleMoveStart, pendingChanges]);

  // Filter selections for current page
  const pageSelections = allSelections.filter(
    s => s.page_number === null || s.page_number === currentPage
  );

  // Show current drawing if any
  const currentDraw = getCurrentDraw();
  const drawingThisPage = currentDraw && 
    (currentDraw.page_number === null || currentDraw.page_number === currentPage);

  if (!isRendered || !showSelections || isViewingProcessedDocument) {
    return null;
  }

  return (
    <>
      {/* Selection overlay */}
      <div
        id="__selection_layer__"
        className="absolute inset-0 pointer-events-auto"
        style={{
          width: documentSize.width,
          height: documentSize.height,
          cursor: mode === 'select' ? 'crosshair' : 'default',
        }}
        onClick={() => selectSelection(null)}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && mode === 'select' && e.button === 0) {
            handleCreateStart(e);
          }
        }}
      >
        {/* Render all selections for this page */}
        {pageSelections.map(renderSelectionBox)}
        
        {/* Render current drawing */}
        {drawingThisPage && currentDraw && (
          <div
            className="absolute pointer-events-none border border-blue-400 text-blue-500 overflow-hidden"
            style={{
              left: `${currentDraw.x * documentSize.width}px`,
              top: `${currentDraw.y * documentSize.height}px`,
              width: `${Math.abs(currentDraw.width) * documentSize.width}px`,
              height: `${Math.abs(currentDraw.height) * documentSize.height}px`,
            }}
          >
            {/* Backdrop brightness to gently lift darker areas under live drawing */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backdropFilter: 'brightness(1.08)',
                WebkitBackdropFilter: 'brightness(1.08)',
                backgroundColor: 'rgba(255,255,255,0.001)',
              }}
            />
            {/* Subtle solid tint using currentColor */}
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundColor: 'currentColor' }} />
            {/* Diagonal stripe overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage: `linear-gradient(135deg, currentColor 2.25%, transparent 2.25%, transparent 50%, currentColor 50%, currentColor 52.25%, transparent 52.25%, transparent 100%)`,
                backgroundSize: '20px 20px',
              }}
            />
          </div>
        )}
      </div>

    </>
  );
}
