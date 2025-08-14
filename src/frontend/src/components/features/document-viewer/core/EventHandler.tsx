/**
 * Unified Event Handling System
 * Phase 2.3: Event Handling Optimization - Single event listener with delegation
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { useViewerState } from '../hooks/useViewerState';

interface EventHandlerProps {
  children: React.ReactNode;
  documentSize: { width: number; height: number };
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
 * Unified Event Handler Component
 * Manages all mouse/touch events for the viewer with delegation
 */
export function UnifiedEventHandler({ children, documentSize }: EventHandlerProps) {
  const {
    mode,
    isPanning,
    setIsPanning,
    pan,
    setPan,
    zoom,
    startSelection,
    updateSelection,
    endSelection,
    pageRefs,
    screenToDocument,
    dispatch,
  } = useViewerState();

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

  // Debounced expensive operations
  const [debouncedSelectionUpdate, cancelSelectionUpdate] = useDebounce((e: MouseEvent) => {
    updateSelection(e as any); // Type assertion needed for MouseEvent vs React.MouseEvent
  }, 10);

  // Main mouse event handler with delegation
  const handleMouseEvent = useCallback((event: MouseEvent) => {
    const { type, clientX, clientY, button } = event;
    
    // Only handle left mouse button
    if (button !== 0 && type !== 'mousemove' && type !== 'mouseup' && type !== 'mouseleave') {
      return;
    }

    switch (type) {
      case 'mousedown':
        handleMouseDown(event);
        break;
      case 'mousemove':
        handleMouseMove(event);
        break;
      case 'mouseup':
      case 'mouseleave':
        handleMouseUp(event);
        break;
    }
  }, [mode, isPanning, pan, zoom]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
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
        startSelection(event as any, pageIndex); // Type assertion needed
      }
    }
  }, [mode, pan, setIsPanning, startSelection, pageRefs]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
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

  const handleMouseUp = useCallback((event: MouseEvent) => {
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

  // Keyboard event handling
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent default for viewer-specific shortcuts
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

  // Context menu handling
  const handleContextMenu = useCallback((event: MouseEvent) => {
    // Prevent default context menu for now
    // TODO: Implement custom context menu with selection actions
    event.preventDefault();
  }, []);

  // Attach global event listeners
  useEffect(() => {
    const element = document.documentElement;
    
    // Mouse events
    element.addEventListener('mousedown', handleMouseEvent);
    element.addEventListener('mousemove', handleMouseEvent);
    element.addEventListener('mouseup', handleMouseEvent);
    element.addEventListener('mouseleave', handleMouseEvent);
    element.addEventListener('contextmenu', handleContextMenu);
    
    // Keyboard events
    element.addEventListener('keydown', handleKeyDown);
    
    return () => {
      element.removeEventListener('mousedown', handleMouseEvent);
      element.removeEventListener('mousemove', handleMouseEvent);
      element.removeEventListener('mouseup', handleMouseEvent);
      element.removeEventListener('mouseleave', handleMouseEvent);
      element.removeEventListener('contextmenu', handleContextMenu);
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseEvent, handleKeyDown, handleContextMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSelectionUpdate();
    };
  }, [cancelSelectionUpdate]);

  return <>{children}</>;
}

export default UnifiedEventHandler;
