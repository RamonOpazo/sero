import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useViewerState } from '../hooks/useViewerState';
import {
  type Point,
  clampPan,
} from './CoordinateSystem';

/**
 * Throttle utility for high-frequency events like mouse move
 */
function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      func(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        func(...args);
      }, delay - (now - lastCall.current));
    }
  }, [func, delay]) as T;
}

/**
 * Debounce utility for expensive operations
 */
function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): [T, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedFunc = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      func(...args);
    }, delay);
  }, [func, delay]) as T;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cancel;
  }, [cancel]);

  return [debouncedFunc, cancel];
}

interface UnifiedViewportProps {
  children: React.ReactNode;
  className?: string;
  documentSize?: { width: number; height: number };
}

export function UnifiedViewport({ 
  children, 
  className,
  documentSize = { width: 800, height: 600 }
}: UnifiedViewportProps) {
  const {
    zoom,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    mode,
    isRendered,
    getViewportBounds,
    screenToViewport: screenToViewportCoords,
    screenToDocument: screenToDocumentCoords,
    startSelection,
    updateSelection,
    endSelection,
    pageRefs,
    dispatch,
  } = useViewerState();
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  
  // Event state management
  const eventStateRef = useRef<{
    isMouseDown: boolean;
    panStart: { x: number; y: number } | null;
    selectionPageIndex: number | null;
  }>({
    isMouseDown: false,
    panStart: null,
    selectionPageIndex: null,
  });

  // Throttled pan update for smooth performance
  const throttledPanUpdate = useThrottle((newPan: { x: number; y: number }) => {
    setPan(newPan);
  }, 16); // ~60fps

  // Debounced expensive operations for selection updates
  const [debouncedSelectionUpdate, cancelSelectionUpdate] = useDebounce((e: React.MouseEvent) => {
    updateSelection(e);
  }, 10);

  // Mouse event handlers with mode delegation
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return; // Only handle left mouse button
    
    event.preventDefault();
    eventStateRef.current.isMouseDown = true;

    if (mode === 'pan') {
      setIsPanning(true);
      eventStateRef.current.panStart = {
        x: event.clientX - pan.x,
        y: event.clientY - pan.y,
      };
    } else if (mode === 'select') {
      // Find which page was clicked for selection
      const pageIndex = 0; // TODO: Multi-page support
      const pageRef = pageRefs.current.get(pageIndex);
      
      if (pageRef) {
        eventStateRef.current.selectionPageIndex = pageIndex;
        startSelection(event, pageIndex);
      }
    }
  }, [mode, pan, setIsPanning, startSelection, pageRefs]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!eventStateRef.current.isMouseDown) return;

    if (mode === 'pan' && isPanning && eventStateRef.current.panStart) {
      const newPan = {
        x: event.clientX - eventStateRef.current.panStart.x,
        y: event.clientY - eventStateRef.current.panStart.y,
      };
      
      // Use throttled update for smooth panning
      throttledPanUpdate(newPan);
    } else if (mode === 'select' && eventStateRef.current.selectionPageIndex !== null) {
      // Use debounced update for selections to reduce overhead
      debouncedSelectionUpdate(event);
    }
  }, [mode, isPanning, throttledPanUpdate, debouncedSelectionUpdate]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    eventStateRef.current.isMouseDown = false;

    if (mode === 'pan' && isPanning) {
      setIsPanning(false);
      eventStateRef.current.panStart = null;
    } else if (mode === 'select' && eventStateRef.current.selectionPageIndex !== null) {
      cancelSelectionUpdate();
      endSelection();
      eventStateRef.current.selectionPageIndex = null;
    }
  }, [mode, isPanning, setIsPanning, cancelSelectionUpdate, endSelection]);

  const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Treat mouse leave as mouse up to end any ongoing operations
    handleMouseUp(event);
  }, [handleMouseUp]);

  // Context menu handling
  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent default context menu for now
    // TODO: Implement custom context menu with selection actions
    event.preventDefault();
  }, []);

  // Keyboard event handling - attach to document for global shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle if the viewport is focused or no other input is focused
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
    const isModifierPressed = ctrlKey || metaKey || altKey;

    switch (key) {
      case 'Escape':
        // Cancel current operation
        if (isPanning) {
          setIsPanning(false);
          eventStateRef.current.panStart = null;
        }
        if (eventStateRef.current.selectionPageIndex !== null) {
          cancelSelectionUpdate();
          endSelection();
          eventStateRef.current.selectionPageIndex = null;
        }
        event.preventDefault();
        break;

      case ' ': // Spacebar for temporary pan mode
        if (!isModifierPressed && mode === 'select') {
          // TODO: Implement temporary pan mode
          event.preventDefault();
        }
        break;

      case 'z':
        if ((ctrlKey || metaKey) && !altKey) {
          if (shiftKey) {
            // Redo
            dispatch({ type: 'REDO_SELECTION' });
          } else {
            // Undo
            dispatch({ type: 'UNDO_SELECTION' });
          }
          event.preventDefault();
        }
        break;

      case '+':
      case '=':
        if (ctrlKey || metaKey) {
          dispatch({ type: 'SET_ZOOM', payload: Math.min(zoom * 1.1, 3) });
          event.preventDefault();
        }
        break;

      case '-':
        if (ctrlKey || metaKey) {
          dispatch({ type: 'SET_ZOOM', payload: Math.max(zoom / 1.1, 0.1) });
          event.preventDefault();
        }
        break;

      case '0':
        if (ctrlKey || metaKey) {
          dispatch({ type: 'RESET_VIEW' });
          event.preventDefault();
        }
        break;
    }
  }, [mode, isPanning, zoom, setIsPanning, cancelSelectionUpdate, endSelection, dispatch]);

  // Attach keyboard event listeners to document
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Update viewport bounds reference
  useEffect(() => {
    if (viewportRef.current) {
      // Store reference for coordinate calculations in the unified state
      // The state management will handle viewport bounds calculation
    }
  }, []);

  // Cleanup animation frame and debounced operations on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cancelSelectionUpdate();
    };
  }, [cancelSelectionUpdate]);

  // Calculate transform styles
  const transformStyle = React.useMemo(() => ({
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
    transformOrigin: '0 0',
    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
    willChange: isPanning ? 'transform' : 'auto',
  }), [pan.x, pan.y, zoom, isPanning]);

  // Cursor style based on mode and state
  const cursorStyle = React.useMemo(() => {
    if (mode === 'pan') {
      return isPanning ? 'grabbing' : 'grab';
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        tabIndex={0} // Make the viewport focusable for keyboard events
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
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
