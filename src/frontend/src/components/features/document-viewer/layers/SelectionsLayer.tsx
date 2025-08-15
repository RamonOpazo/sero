import React, { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { SelectionCreateType, SelectionType } from "@/types";
import { useViewerState } from '../hooks/useViewerState';
import { Save, Trash2, Globe } from "lucide-react";
import { api } from "@/lib/axios";
import { toast } from "sonner";

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
    isViewingProcessedDocument,
  } = useViewerState();

  // Get the selected selection from global state
  const globalSelectedSelection = useViewerState().selections.selectedSelection;
  
  // Derive the current selection data from global state to ensure it's always up-to-date
  const selectedSelection = React.useMemo(() => {
    if (!globalSelectedSelection) return null;
    
    const { type, index } = globalSelectedSelection;
    const currentData = type === 'existing' ? existingSelections[index] : newSelections[index];
    
    // Return null if the selection no longer exists at that index
    if (!currentData) {
      dispatch({ type: 'SET_SELECTED_SELECTION', payload: null });
      return null;
    }
    
    return {
      type,
      index,
      selection: currentData
    };
  }, [globalSelectedSelection, existingSelections, newSelections, dispatch]);

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

  // State for context menu
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Track which existing selections have been edited (by index)
  const [editedExistingSelections, setEditedExistingSelections] = useState<Set<number>>(new Set());

  // Handle context menu actions
  const handleSaveSelection = useCallback(async (sel: SelectionCreateType, type: 'existing' | 'new', index: number) => {
    console.log('Save selection:', { sel, type, index });
    
    if (!currentDocument?.id) {
      console.error('No document ID available for saving selection');
      toast.error('Cannot save selection: No document loaded');
      setContextMenuOpen(false);
      return;
    }

    try {
      if (type === 'new') {
        // Create new selection
        const selectionData = {
          page_number: sel.page_number || null,
          x: sel.x,
          y: sel.y,
          width: sel.width,
          height: sel.height,
          confidence: null, // Manual selections have no confidence
          document_id: currentDocument.id,
        };

        console.log('Creating new selection:', selectionData);

        const result = await api.safe.post(
          `/documents/id/${currentDocument.id}/selections`,
          selectionData
        );

        if (result.ok) {
          const savedSelection = result.value as SelectionType;
          
          // Remove from newSelections
          dispatch({
            type: 'DELETE_SELECTION',
            payload: index
          });
          
          // Add to existingSelections
          dispatch({
            type: 'SET_EXISTING_SELECTIONS',
            payload: [...existingSelections, savedSelection]
          });
          
          dispatch({ type: 'SET_SELECTED_SELECTION', payload: null });
          toast.success('Selection saved successfully');
          console.log('Selection saved successfully:', savedSelection);
        } else {
          throw new Error((result.error as any)?.response?.data?.detail || (result.error as any)?.message || 'Failed to save selection');
        }
        
      } else if (type === 'existing' && editedExistingSelections.has(index)) {
        // Update existing selection
        console.log('Attempting to update existing selection at index:', index);
        console.log('existingSelections array:', existingSelections);
        console.log('existingSelections length:', existingSelections.length);
        
        const existingSelection = existingSelections[index];
        console.log('existingSelection at index:', existingSelection);
        
        if (!existingSelection) {
          throw new Error(`Cannot update selection: No selection found at index ${index}`);
        }
        
        console.log('existingSelection keys:', Object.keys(existingSelection));
        console.log('existingSelection.id:', existingSelection.id);
        
        if (!existingSelection.id) {
          // This existing selection doesn't have an ID, which means it wasn't properly loaded from the API
          // For now, we'll treat this as a new selection and create it instead of updating
          console.warn('Existing selection has no ID, treating as new selection for creation');
          
          const selectionData = {
            page_number: sel.page_number || null,
            x: sel.x,
            y: sel.y,
            width: sel.width,
            height: sel.height,
            confidence: sel.confidence || null,
            document_id: currentDocument.id,
          };

          console.log('Creating selection (no ID found):', selectionData);

          const result = await api.safe.post(
            `/documents/id/${currentDocument.id}/selections`,
            selectionData
          );

          if (result.ok) {
            const savedSelection = result.value as SelectionType;
            
            // Replace the selection without ID with the new one that has an ID
            const updatedExistingSelections = [...existingSelections];
            updatedExistingSelections[index] = savedSelection;
            
            dispatch({
              type: 'SET_EXISTING_SELECTIONS',
              payload: updatedExistingSelections
            });
            
            // Remove from edited selections set
            setEditedExistingSelections(prev => {
              const newSet = new Set(prev);
              newSet.delete(index);
              return newSet;
            });
            
            dispatch({ type: 'SET_SELECTED_SELECTION', payload: null });
            toast.success('Selection saved successfully');
            console.log('Selection created successfully (no ID case):', savedSelection);
            setContextMenuOpen(false);
            return;
          } else {
            throw new Error((result.error as any)?.response?.data?.detail || (result.error as any)?.message || 'Failed to save selection');
          }
        }

        const updateData = {
          page_number: sel.page_number || null,
          x: sel.x,
          y: sel.y,
          width: sel.width,
          height: sel.height,
          confidence: sel.confidence || null,
        };

        console.log('Updating existing selection:', { id: existingSelection.id, updateData });

        const result = await api.safe.put(
          `/selections/id/${existingSelection.id}`,
          updateData
        );

        if (result.ok) {
          const updatedSelection = result.value as SelectionType;
          
          // Update the selection in existingSelections
          const updatedExistingSelections = [...existingSelections];
          updatedExistingSelections[index] = updatedSelection;
          
          dispatch({
            type: 'SET_EXISTING_SELECTIONS',
            payload: updatedExistingSelections
          });
          
          // Remove from edited selections set
          setEditedExistingSelections(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
          });
          
          dispatch({ type: 'SET_SELECTED_SELECTION', payload: null });
          toast.success('Selection updated successfully');
          console.log('Selection updated successfully:', updatedSelection);
        } else {
          throw new Error((result.error as any)?.response?.data?.detail || (result.error as any)?.message || 'Failed to update selection');
        }
      } else {
        // Existing selection that hasn't been edited - no need to save
        setContextMenuOpen(false);
        return;
      }
      
    } catch (error) {
      console.error('Error saving selection:', error);
      toast.error('Failed to save selection', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      });
    }
    
    setContextMenuOpen(false);
  }, [currentDocument, dispatch, existingSelections, api, editedExistingSelections]);

  const handleRemoveSelection = useCallback((type: 'existing' | 'new', index: number) => {
    console.log('Remove selection:', { type, index });
    if (type === 'new') {
      deleteSelection(index);
    } else {
      // Remove existing selection
      dispatch({
        type: 'REMOVE_EXISTING_SELECTION',
        payload: { index }
      });
    }
    dispatch({ type: 'SET_SELECTED_SELECTION', payload: null });
    setContextMenuOpen(false);
  }, [deleteSelection, dispatch]);

  const handleMakeSelectionGlobal = useCallback((type: 'existing' | 'new', index: number) => {
    console.log('Make selection global:', { type, index });
    
    if (type === 'new') {
      // Update new selection to have page_number = 0 (all pages)
      const updatedSelection = { ...newSelections[index], page_number: 0 };
      dispatch({
        type: 'UPDATE_NEW_SELECTION',
        payload: { index, selection: updatedSelection }
      });
    } else {
      // Update existing selection to have page_number = 0 (all pages)
      const existingSelection = existingSelections[index];
      if (existingSelection) {
        const updatedSelection = { ...existingSelection, page_number: 0 };
        dispatch({
          type: 'UPDATE_EXISTING_SELECTION',
          payload: { index, selection: updatedSelection }
        });
        
        // Mark this existing selection as edited so it can be saved
        setEditedExistingSelections(prev => new Set(prev).add(index));
      }
    }
    
    // The selectedSelection will be automatically updated via the derived state
    // since the global state has been updated
    
    setContextMenuOpen(false);
  }, [dispatch, newSelections, existingSelections, setEditedExistingSelections]);

  // Handle selection click
  const handleSelectionClick = (
    type: 'existing' | 'new',
    index: number
  ) => {
    dispatch({ type: 'SET_SELECTED_SELECTION', payload: { type, index } });
  };

  // Handle move drag start
  const handleMoveStart = useCallback((e: React.MouseEvent) => {
    // Only allow left-click dragging (button 0)
    if (e.button !== 0) return;
    
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
    // Only allow left-click dragging (button 0)
    if (e.button !== 0) return;
    
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
    dispatch({ type: 'SET_SELECTED_SELECTION', payload: null });
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
    
    // The selectedSelection will automatically reflect the current state
    // since it's derived from the global state
    
    // Update the actual selection in the viewer state WITHOUT creating history entries
    if (selectedSelection.type === 'existing') {
      dispatch({
        type: 'UPDATE_EXISTING_SELECTION_NO_HISTORY',
        payload: { index: selectedSelection.index, selection: newSelection }
      });
      
      // Mark this existing selection as edited
      setEditedExistingSelections(prev => new Set(prev).add(selectedSelection.index));
    } else {
      dispatch({
        type: 'UPDATE_NEW_SELECTION_NO_HISTORY',
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
    
    if ((resizeState || moveState) && selectedSelection) {
      // Save final state to history after resize/move operation
      dispatch({ 
        type: selectedSelection.type === 'existing' ? 'UPDATE_EXISTING_SELECTION' : 'UPDATE_NEW_SELECTION',
        payload: { index: selectedSelection.index, selection: selectedSelection.selection }
      });
      console.log('Drag operation completed:', selectedSelection.selection);
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

  // Close context menu on click outside or escape
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
  ) => {
    // Convert normalized coordinates to pixel coordinates within the document
    const left = sel.x * documentSize.width;
    const top = sel.y * documentSize.height;
    const width = Math.abs(sel.width) * documentSize.width;
    const height = Math.abs(sel.height) * documentSize.height;

    const isSelected = selectedSelection?.type === (isNew ? 'new' : 'existing') && 
                      selectedSelection?.index === index;
    
    // Check if selection is global (applies to all pages)
    const isGlobalSelection = sel.page_number === 0 || sel.page_number === null;

    const selectionElement = (
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
              ? isGlobalSelection
                ? "border border-purple-400/60 bg-purple-50/10 hover:border-purple-500/80" // Global new selections - purple
                : "border border-green-400/60 bg-green-50/10 hover:border-green-500/80"   // Page-specific new selections - green
              : isGlobalSelection
                ? "border border-orange-400/60 bg-orange-50/10 hover:border-orange-500/80" // Global existing selections - orange
                : "border border-slate-400/60 bg-slate-50/10 hover:border-slate-500/80"   // Page-specific existing selections - slate
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
          handleSelectionClick(isNew ? 'new' : 'existing', index);
        }}
        onMouseDown={(e) => {
          // Only start move if this selection is selected, left-click, and we're not clicking on resize handles
          if (isSelected && e.button === 0 && !e.defaultPrevented) {
            handleMoveStart(e);
          }
        }}
      >
        {/* Resize handles for selected selection */}
        {isSelected && renderResizeHandles()}
      </div>
    );

    // Add context menu handler for selected selections
    if (isSelected) {
      return (
        <div
          key={key}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setContextMenuOpen(true);
          }}
        >
          {selectionElement}
        </div>
      );
    }

    return selectionElement;
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

  if (!isRendered || !showSelections || isViewingProcessedDocument) {
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
        onClick={() => dispatch({ type: 'SET_SELECTED_SELECTION', payload: null })}
        onMouseDown={(e) => {
          // Only handle left-click mouse down on empty space (not on existing selections)
          if (e.target === e.currentTarget && mode === 'select' && e.button === 0) {
            handleCreateStart(e);
          }
        }}
      >
        {/* Existing selections from database */}
        {pageExisting.map((sel, i) => renderBox(sel, false, `existing-${i}`, i))}
        
        {/* New selections */}
        {pageNew.map((sel, i) => renderBox(sel, true, `new-${i}`, i))}
        
        {/* Currently drawing selection */}
        {drawingThisPage && renderBox(drawingThisPage, true, "drawing", -1)}
      </div>

      {/* Context menu positioned at mouse cursor - using portal to render outside transformed space */}
      {contextMenuOpen && contextMenuPosition && selectedSelection && createPortal(
        <div
          className="fixed z-[1000] bg-popover text-popover-foreground rounded-md border shadow-md min-w-[8rem] p-1"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Show Save option for new selections OR edited existing selections */}
          {(selectedSelection.type === 'new' || 
            (selectedSelection.type === 'existing' && editedExistingSelections.has(selectedSelection.index))
          ) && (
            <>
              <div
                className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveSelection(
                    selectedSelection.selection, 
                    selectedSelection.type, 
                    selectedSelection.index
                  );
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </div>
              <div className="bg-border -mx-1 my-1 h-px" />
            </>
          )}
          
          {/* Show "Make Global" option if selection is not already global (page_number !== 0) */}
          {selectedSelection.selection.page_number !== 0 && (
            <>
              <div
                className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleMakeSelectionGlobal(
                    selectedSelection.type, 
                    selectedSelection.index
                  );
                }}
              >
                <Globe className="mr-2 h-4 w-4" />
                Show on All Pages
              </div>
              <div className="bg-border -mx-1 my-1 h-px" />
            </>
          )}
          
          <div
            className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoveSelection(
                selectedSelection.type, 
                selectedSelection.index
              );
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </div>
        </div>,
        document.body
      )}

      {/* No interaction layer needed - handled by UnifiedEventHandler */}
    </>
  );
}
