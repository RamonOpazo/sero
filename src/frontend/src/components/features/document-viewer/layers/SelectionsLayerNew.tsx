/**
 * Simplified SelectionsLayer using the new SelectionManager
 * 
 * This replaces the complex SelectionsLayer with a much cleaner implementation
 * that uses the new SelectionManager for state management.
 */

import React, { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useSelections } from '../core/SelectionProvider';
import { useViewerState } from '../hooks/useViewerState';
import { Save, Trash2 } from "lucide-react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import type { Selection, SelectionCreateType } from '../types/viewer';

type Props = { 
  documentSize: { width: number; height: number };
};

export default function SelectionsLayerNew({ documentSize }: Props) {
  // Old system (for non-selection state)
  const {
    isRendered,
    showSelections,
    currentPage,
    mode,
    isViewingProcessedDocument,
    document: currentDocument,
  } = useViewerState();

  // New selection system
  const {
    state: selectionState,
    allSelections,
    selectedSelection,
    selectSelection,
    deleteSelection,
    // deleteSelectedSelection, // TODO: Use for keyboard shortcuts
    startDraw,
    updateDraw,
    finishDraw,
    // cancelDraw, // TODO: Use for cancel operations
  } = useSelections();

  // Local UI state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'create';
    corner?: string;
    startMousePos: { x: number; y: number };
    startPoint?: { x: number; y: number };
  } | null>(null);

  const isDraggingRef = useRef(false);

  // Handle selection click
  const handleSelectionClick = useCallback((selection: Selection) => {
    selectSelection(selection.id);
  }, [selectSelection]);

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
      page_number: currentPage + 1,
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
      // Handle creating new selection
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
      
      updateDraw(constrainedSelection);
    }
    
    // TODO: Add move and resize handling in future iterations
  }, [dragState, documentSize, currentPage, currentDocument, updateDraw]);

  // Handle mouse up to end drag operations
  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    if (dragState?.type === 'create') {
      finishDraw();
    }
    
    setDragState(null);
    isDraggingRef.current = false;
  }, [dragState, finishDraw]);

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

  // Close context menu handlers
  React.useEffect(() => {
    if (contextMenuOpen) {
      const handleClickOutside = () => setContextMenuOpen(false);
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setContextMenuOpen(false);
      };
      
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenuOpen]);

  // Save selection to backend
  const handleSaveSelection = useCallback(async (selection: Selection) => {
    if (!currentDocument?.id) {
      toast.error('Cannot save selection: No document loaded');
      return;
    }

    try {
      const selectionData = {
        page_number: selection.page_number || null,
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height,
        confidence: 'confidence' in selection ? selection.confidence : null,
        document_id: currentDocument.id,
      };

      const result = await api.safe.post(
        `/documents/id/${currentDocument.id}/selections`,
        selectionData
      );

      if (result.ok) {
        // TODO: Update the selection system with the saved selection
        toast.success('Selection saved successfully');
      } else {
        throw new Error((result.error as any)?.response?.data?.detail || 'Failed to save selection');
      }
    } catch (error) {
      console.error('Error saving selection:', error);
      toast.error('Failed to save selection');
    }
    
    setContextMenuOpen(false);
  }, [currentDocument]);

  // Remove selection
  const handleRemoveSelection = useCallback((selectionId: string) => {
    deleteSelection(selectionId);
    setContextMenuOpen(false);
  }, [deleteSelection]);

  // Render selection box
  const renderSelectionBox = useCallback((selection: Selection) => {
    // Convert normalized coordinates to pixel coordinates
    const left = selection.x * documentSize.width;
    const top = selection.y * documentSize.height;
    const width = Math.abs(selection.width) * documentSize.width;
    const height = Math.abs(selection.height) * documentSize.height;

    const isSelected = selectedSelection?.id === selection.id;
    const isNew = !('created_at' in selection); // Simple check for new vs saved
    const isGlobal = selection.page_number === 0 || selection.page_number === null;

    const selectionElement = (
      <div
        key={selection.id}
        className={cn(
          "absolute pointer-events-auto group transition-all duration-200",
          isSelected
            ? "border border-blue-600 bg-blue-100/20"
            : isNew
              ? isGlobal
                ? "border border-purple-400/60 bg-purple-50/10 hover:border-purple-500/80"
                : "border border-green-400/60 bg-green-50/10 hover:border-green-500/80"
              : isGlobal
                ? "border border-orange-400/60 bg-orange-50/10 hover:border-orange-500/80"
                : "border border-slate-400/60 bg-slate-50/10 hover:border-slate-500/80"
        )}
        style={{ 
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectionClick(selection);
        }}
        onContextMenu={(e) => {
          if (isSelected) {
            e.preventDefault();
            e.stopPropagation();
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setContextMenuOpen(true);
          }
        }}
      />
    );

    return selectionElement;
  }, [documentSize, selectedSelection, handleSelectionClick]);

  // Filter selections for current page
  const currentPageNumber = currentPage + 1;
  const pageSelections = allSelections.filter(
    s => s.page_number === null || s.page_number === 0 || s.page_number === currentPageNumber
  );

  // Show current drawing if any
  const currentDraw = selectionState.currentDraw;
  const drawingThisPage = currentDraw && 
    (currentDraw.page_number === null || currentDraw.page_number === 0 || currentDraw.page_number === currentPageNumber);

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
        {drawingThisPage && (
          <div
            className="absolute pointer-events-none border border-blue-400 bg-blue-50/20"
            style={{
              left: `${currentDraw.x * documentSize.width}px`,
              top: `${currentDraw.y * documentSize.height}px`,
              width: `${Math.abs(currentDraw.width) * documentSize.width}px`,
              height: `${Math.abs(currentDraw.height) * documentSize.height}px`,
            }}
          />
        )}
      </div>

      {/* Context menu */}
      {contextMenuOpen && contextMenuPosition && selectedSelection && createPortal(
        <div
          className="fixed z-[1000] bg-popover text-popover-foreground rounded-md border shadow-md min-w-[8rem] p-1"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleSaveSelection(selectedSelection)}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </div>
          <div className="bg-border -mx-1 my-1 h-px" />
          <div
            className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleRemoveSelection(selectedSelection.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
