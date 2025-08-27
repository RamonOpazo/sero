import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useViewportState, useViewportActions } from '../../providers/viewport-provider';
import { useSelections } from '../../providers/selection-provider';
import { createKeyboardHandler } from './input/keyboard';
import { useWheelHandler, useMouseButtonHandlers } from './input/mouse';
import { useThrottle } from '@/lib/hooks/use-throttle';

interface UnifiedViewportProps {
  children: React.ReactNode;
  className?: string;
  documentSize?: { width: number; height: number };
}

export function UnifiedViewport({ 
  children, 
  className,
}: UnifiedViewportProps) {
  // Get viewport state from new minimal system
  const {
    zoom,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    mode,
    dispatch,
    currentPage,
    numPages,
    setCurrentPage,
    setMode,
    showHelpOverlay,
    showInfoPanel,
    showSelectionsPanel,
    showPromptPanel,
    isViewingProcessedDocument,
  } = useViewportState();
  
  // Get viewport actions
  const {
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
    toggleHelpOverlay,
  } = useViewportActions();
  
  // Get selection state from new system
  const {
    deleteSelectedSelection,
    undo,
    redo,
    cancelDraw,
    setOnNavigateToPage,
  } = useSelections();
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Event state management for multi-button mouse handling
  const eventStateRef = useRef<{
    leftButtonDown: boolean;
    middleButtonDown: boolean;
    rightButtonDown: boolean;
    panStart: { x: number; y: number } | null;
    selectionPageIndex: number | null;
    isTemporaryPanning: boolean;
    originalMode: string | null; // Store original mode during temporary operations
  }>({
    leftButtonDown: false,
    middleButtonDown: false,
    rightButtonDown: false,
    panStart: null,
    selectionPageIndex: null,
    isTemporaryPanning: false,
    originalMode: null,
  });

  // Throttled pan update for smooth performance
  const throttledPanUpdate = useThrottle((newPan: { x: number; y: number }) => {
    setPan(newPan);
  }, 16); // ~60fps

// Mouse button handlers via adapter hook
  const { onContextMenu, onMouseDown, onMouseMove, onMouseUp, onMouseLeave } = useMouseButtonHandlers({
    eventStateRef,
    throttledPanUpdate,
  });

  // Keyboard event handling
  const handleKeyDown = React.useMemo(() => createKeyboardHandler({
    isPanning,
    setIsPanning,
    cancelDraw,
    showHelpOverlay,
    showInfoPanel,
    showSelectionsPanel,
    showPromptPanel,
    toggleHelpOverlay,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
    numPages,
    currentPage,
    setCurrentPage,
    zoom,
    dispatch,
    setMode,
    deleteSelectedSelection,
    undo,
    redo,
    isViewingProcessedDocument,
  }), [
    isPanning,
    setIsPanning,
    cancelDraw,
    showHelpOverlay,
    showInfoPanel,
    showSelectionsPanel,
    showPromptPanel,
    toggleHelpOverlay,
    toggleInfoPanel,
    toggleSelectionsPanel,
    togglePromptPanel,
    numPages,
    currentPage,
    setCurrentPage,
    zoom,
    dispatch,
    setMode,
    deleteSelectedSelection,
    undo,
    redo,
    isViewingProcessedDocument,
  ]);

  // Wire navigation callback so undo/redo move to the relevant page
  useEffect(() => {
    setOnNavigateToPage((pageNumber: number) => {
      // Only navigate if the page is different to avoid unnecessary re-render cycles
      if (typeof pageNumber === 'number' && pageNumber !== currentPage) {
        setCurrentPage(pageNumber);
      }
    });
    return () => setOnNavigateToPage(undefined);
  }, [setOnNavigateToPage, setCurrentPage, currentPage]);

  // Attach keyboard and wheel event listeners to document/viewport
  const wheelHandler = useWheelHandler(viewportRef);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener('wheel', wheelHandler, { passive: false });
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        viewport.removeEventListener('wheel', wheelHandler);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, wheelHandler]);

  // Update viewport bounds reference
  useEffect(() => {
    if (viewportRef.current) {
      // Store reference for coordinate calculations in the unified state
      // The state management will handle viewport bounds calculation
    }
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Calculate transform styles - only translation since PDF renders at zoom level
  const transformStyle = React.useMemo(() => ({
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
    transformOrigin: '0 0',
    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
    willChange: isPanning ? 'transform' : 'auto',
  }), [pan.x, pan.y, isPanning]);

  // Cursor style based on mode and state
  const cursorStyle = React.useMemo(() => {
    // Show grabbing cursor during temporary panning (middle button)
    if (eventStateRef.current.isTemporaryPanning || (mode === 'pan' && isPanning)) {
      return 'grabbing';
    }
    // Show grab cursor in pan mode or during middle button hover
    if (mode === 'pan') {
      return 'grab';
    }
    return 'default';
  }, [mode, isPanning]);

  return (
      <div
        ref={viewportRef}
        className={cn(
          'unified-viewport',
          'relative h-full w-full overflow-hidden',
          'flex items-center justify-center',
          className
        )}
        style={{ cursor: cursorStyle }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onContextMenu={onContextMenu}
        tabIndex={0} // Make the viewport focusable for keyboard events
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none rounded-md border"
          style={{
            background: `radial-gradient(circle at 2px 2px, color-mix(in srgb, var(--ring) 25%, transparent) 2px, transparent 0px)`,
            backgroundSize: `${25 * zoom}px ${25 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Transform container - all children inherit this transform */}
        <div
          className="unified-transform absolute"
          style={transformStyle}
        >
          {children}
        </div>
      </div>
  );
}

export default UnifiedViewport;
