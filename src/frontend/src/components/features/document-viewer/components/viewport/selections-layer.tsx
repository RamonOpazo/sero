/**
 * Simplified SelectionsLayer using the new SelectionManager
 * 
 * This replaces the complex SelectionsLayer with a much cleaner implementation
 * that uses the new SelectionManager for state management.
 */

import React, { useState, useCallback, useRef } from "react";
import { useSelections } from '../../providers/selections-provider';
import { useViewportState } from '../../providers/viewport-provider';
import type { Selection, SelectionCreateDraft } from '../../types/viewer';
import { getNormalizedState } from '../../utils/selection-styles';
import SelectionBox from '@/components/shared/selection-box';

type Corner = 'nw' | 'ne' | 'sw' | 'se';

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
    numPages,
  } = useViewportState();

  // New selection system
  const {
    state: selectionState,
    allSelections,
    uiSelections,
    selectedSelection,
    selectSelection,
    updateSelectionBatch,
    finishBatchOperation,
    startDraw,
    updateDraw,
    finishDraw,
    onSelectionDoubleClick,
    getCurrentDraw,
    beginBatchOperation,
    // Template overlays API
    getTemplateSelectionsForPage,
  } = useSelections() as any;
  
  // Touch selectionState to avoid TS unused variable during builds
  void selectionState;
  
  // Interaction state for resize, move, and create operations
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'create';
    corner?: Corner;
    startMousePos: { x: number; y: number };
    startPoint?: { x: number; y: number };
    initialSelection?: Selection;
  } | null>(null);

  const isDraggingRef = useRef(false);

  // Track which selection is hovered (topmost by render order)
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
    const initialSelection: SelectionCreateDraft = {
      scope: 'document',
      x,
      y,
      width: 0,
      height: 0,
      page_number: currentPage,
      document_id: currentDocument.id,
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
      const newSelection: SelectionCreateDraft = {
        scope: 'document',
        x: Math.min(startPoint.x, currentX),
        y: Math.min(startPoint.y, currentY),
        width: Math.abs(currentX - startPoint.x),
        height: Math.abs(currentY - startPoint.y),
        page_number: currentPage,
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
    
    // Prevent editing for committed or staged_deletion selections
    const norm = getNormalizedState((selection as any).state);
    if (norm === 'committed' || norm === 'staged_deletion') {
      return;
    }

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
  const handleResizeStart = useCallback((corner: Corner, e: React.MouseEvent, selection: Selection) => {
    if (e.button !== 0) return; // Only left click
    
    e.stopPropagation();
    e.preventDefault();
    
    // Prevent editing for committed or staged_deletion selections
    const norm = getNormalizedState((selection as any).state);
    if (norm === 'committed' || norm === 'staged_deletion') {
      return;
    }

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
    const handleSize = 8;
    const positions = [
      { name: 'nw', style: { top: -handleSize/2, left: -handleSize/2, cursor: 'nw-resize' } },
      { name: 'ne', style: { top: -handleSize/2, right: -handleSize/2, cursor: 'ne-resize' } },
      { name: 'sw', style: { bottom: -handleSize/2, left: -handleSize/2, cursor: 'sw-resize' } },
      { name: 'se', style: { bottom: -handleSize/2, right: -handleSize/2, cursor: 'se-resize' } },
    ];

    return positions.map(({ name, style }) => (
      <div
        key={name}
        data-testid={`resize-${name}`}
        className="absolute bg-blue-600 border border-white shadow-md hover:bg-blue-700 transition-colors z-10"
        style={{
          width: handleSize,
          height: handleSize,
          ...style,
        }}
        onMouseDown={(e) => handleResizeStart(name as Corner, e, selection)}
      />
    ));
  }, [handleResizeStart]);


  // Build UI meta map for quick lookup
  const uiMetaById = React.useMemo(() => {
    const map = new Map<string, any>();
    (uiSelections || []).forEach((u: any) => { if (u && u.id) map.set(u.id, u); });
    return map;
  }, [uiSelections]);

  // Render read-only template selection box (non-interactive)
  const renderTemplateSelectionBox = useCallback((selection: Selection) => {
    const left = selection.x * documentSize.width;
    const top = selection.y * documentSize.height;
    const width = Math.abs(selection.width) * documentSize.width;
    const height = Math.abs(selection.height) * documentSize.height;

    const visualNorm = getNormalizedState((selection as any).state);
    const visualState = visualNorm === "draft" ? "unstaged" : visualNorm;

    return (
      <SelectionBox
        key={`tpl-${selection.id}`}
        id={`tpl-${selection.id}`}
        left={left}
        top={top}
        width={width}
        height={height}
        state={visualState}
        flag={"project_scope"}
        isHovered={false}
        isSelected={false}
        activityContrast={0.3}
        handlerSize={8}
        className="pointer-events-none"
      />
    );
  }, [documentSize]);

  // Render selection box
  const renderSelectionBox = useCallback((selection: Selection) => {
    // Convert normalized coordinates to pixel coordinates
    const left = selection.x * documentSize.width;
    const top = selection.y * documentSize.height;
    const width = Math.abs(selection.width) * documentSize.width;
    const height = Math.abs(selection.height) * documentSize.height;

    const ui = uiMetaById.get(selection.id);
    const isDirty = ui?.dirty === true;
    const isGlobal = selection.page_number === null;
    const isProjectScope = (selection as any).scope === 'project';

    const isSelected = selectedSelection?.id === selection.id;
    const isHovered = hoveredId === selection.id;
    
    const visualNorm = getNormalizedState((selection as any).state);
    const visualState = visualNorm === "draft" ? "unstaged" : visualNorm;

    const visualFlag = 
      isProjectScope ? "project_scope"
      : isGlobal ? "global_page"
      : isDirty ? "dirty"
      : "off";

    return (
      <SelectionBox
        key={selection.id}
        id={selection.id}
        left={left}
        top={top}
        width={width}
        height={height}
        state={visualState}
        flag={visualFlag}
        isHovered={isHovered}
        isSelected={isSelected}
        activityContrast={0.35}
        handlerSize={8}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectionClick(selection);
        }}
        onMouseDown={(e) => {
          if (isSelected && e.button === 0 && !e.defaultPrevented) {
            handleMoveStart(e, selection);
          }
        }}
        onResizeStart={(corner, e) => handleResizeStart(corner as any, e as any, selection)}
      />
    );
  }, [documentSize, selectedSelection, handleSelectionClick, dragState, renderResizeHandles, handleMoveStart, uiMetaById, hoveredId]);

  // Filter selections for current page
  const pageSelections = allSelections.filter(
    (s: any) => s.page_number === null || s.page_number === currentPage,
  );

  // Template project-scoped overlays for current page (read-only)
  const templateSelectionsForPage = getTemplateSelectionsForPage?.(currentPage, numPages) ?? [];

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
        onMouseMove={() => {
          // When moving over empty space, clear hovered marker to avoid stale highlight
          if (!isDraggingRef.current) setHoveredId(null);
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && mode === 'select' && e.button === 0) {
            handleCreateStart(e);
          }
        }}
      >
        {/* Render template overlays first (beneath interactive selections) */}
        {templateSelectionsForPage.map(renderTemplateSelectionBox)}

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
