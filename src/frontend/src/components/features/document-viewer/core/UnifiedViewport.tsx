import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useViewerState } from '../hooks/useViewerState';
import { toast } from 'sonner';

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
}: UnifiedViewportProps) {
  const {
    zoom,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    mode,
    startSelection,
    updateSelection,
    endSelection,
    pageRefs,
    dispatch,
    currentPage,
    numPages,
    setCurrentPage,
    setMode,
    toggleInfoPanel,
    showHelpOverlay,
    toggleHelpOverlay,
    newSelections,
    deleteSelection,
  } = useViewerState();
  
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

  // Debounced expensive operations for selection updates
  const [debouncedSelectionUpdate, cancelSelectionUpdate] = useDebounce((e: React.MouseEvent) => {
    updateSelection(e);
  }, 10);

  // Enhanced mouse event handlers with multi-button support (Option A)
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    // Track which button was pressed
    if (event.button === 0) { // Left button
      eventStateRef.current.leftButtonDown = true;
      
      if (!eventStateRef.current.isTemporaryPanning) {
        if (mode === 'pan') {
          // Left button starts panning in pan mode
          setIsPanning(true);
          eventStateRef.current.panStart = {
            x: event.clientX - pan.x,
            y: event.clientY - pan.y,
          };
        } else {
          // Left button initiates selection in select mode
          const pageIndex = 0; // TODO: Multi-page support
          const pageRef = pageRefs.current.get(pageIndex);
          
          if (pageRef) {
            eventStateRef.current.selectionPageIndex = pageIndex;
            startSelection(event, pageIndex);
          }
        }
      }
      
    } else if (event.button === 1) { // Middle button
      eventStateRef.current.middleButtonDown = true;
      eventStateRef.current.isTemporaryPanning = true;
      eventStateRef.current.originalMode = mode;
      
      // Start temporary panning
      setIsPanning(true);
      eventStateRef.current.panStart = {
        x: event.clientX - pan.x,
        y: event.clientY - pan.y,
      };
      
    } else if (event.button === 2) { // Right button
      eventStateRef.current.rightButtonDown = true;
      // Right button handled in onContextMenu for now
    }
  }, [mode, pan, setIsPanning, startSelection, pageRefs]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Handle temporary panning (middle button)
    if (eventStateRef.current.middleButtonDown && eventStateRef.current.isTemporaryPanning && eventStateRef.current.panStart) {
      const newPan = {
        x: event.clientX - eventStateRef.current.panStart.x,
        y: event.clientY - eventStateRef.current.panStart.y,
      };
      throttledPanUpdate(newPan);
      return;
    }

    // Handle regular mode-based interactions
    if (eventStateRef.current.leftButtonDown) {
      if (mode === 'pan' && isPanning && eventStateRef.current.panStart && !eventStateRef.current.isTemporaryPanning) {
        const newPan = {
          x: event.clientX - eventStateRef.current.panStart.x,
          y: event.clientY - eventStateRef.current.panStart.y,
        };
        throttledPanUpdate(newPan);
      } else if (eventStateRef.current.selectionPageIndex !== null && !eventStateRef.current.isTemporaryPanning) {
        // Use debounced update for selections to reduce overhead
        debouncedSelectionUpdate(event);
      }
    }
  }, [mode, isPanning, throttledPanUpdate, debouncedSelectionUpdate]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 0) { // Left button
      eventStateRef.current.leftButtonDown = false;
      
      if (mode === 'pan' && isPanning && !eventStateRef.current.isTemporaryPanning) {
        setIsPanning(false);
        eventStateRef.current.panStart = null;
      } else if (eventStateRef.current.selectionPageIndex !== null) {
        cancelSelectionUpdate();
        endSelection();
        eventStateRef.current.selectionPageIndex = null;
      }
      
    } else if (event.button === 1) { // Middle button
      eventStateRef.current.middleButtonDown = false;
      
      if (eventStateRef.current.isTemporaryPanning) {
        // End temporary panning
        setIsPanning(false);
        eventStateRef.current.panStart = null;
        eventStateRef.current.isTemporaryPanning = false;
        eventStateRef.current.originalMode = null;
      }
      
    } else if (event.button === 2) { // Right button
      eventStateRef.current.rightButtonDown = false;
      // Right button handling will be in context menu
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
        // Close help overlay if open
        if (showHelpOverlay) {
          toggleHelpOverlay();
        }
        event.preventDefault();
        break;

      // Navigation - Arrow keys for page navigation and scrolling
      case 'ArrowLeft':
      case 'PageUp':
        if (!isModifierPressed && numPages > 1) {
          const newPage = Math.max(0, currentPage - 1);
          if (newPage !== currentPage) {
            setCurrentPage(newPage);
            toast.success(`Page ${newPage + 1} of ${numPages}`);
          }
          event.preventDefault();
        }
        break;

      case 'ArrowRight':
      case 'PageDown':
        if (!isModifierPressed && numPages > 1) {
          const newPage = Math.min(numPages - 1, currentPage + 1);
          if (newPage !== currentPage) {
            setCurrentPage(newPage);
            toast.success(`Page ${newPage + 1} of ${numPages}`);
          }
          event.preventDefault();
        }
        break;


      case 'Home':
        if (!isModifierPressed && numPages > 1) {
          if (currentPage !== 0) {
            setCurrentPage(0);
            toast.success('First page');
          }
          event.preventDefault();
        }
        break;

      case 'End':
        if (!isModifierPressed && numPages > 1) {
          const lastPage = numPages - 1;
          if (currentPage !== lastPage) {
            setCurrentPage(lastPage);
            toast.success('Last page');
          }
          event.preventDefault();
        }
        break;

      // Zoom controls with +/- keys (without modifiers)
      case '+':
      case '=':
        if (!isModifierPressed) {
          const newZoom = Math.min(zoom * 1.1, 3);
          dispatch({ type: 'SET_ZOOM', payload: newZoom });
          toast.success(`Zoom ${Math.round(newZoom * 100)}%`);
          event.preventDefault();
        } else if (ctrlKey || metaKey) {
          // Keep existing Ctrl+Plus behavior
          dispatch({ type: 'SET_ZOOM', payload: Math.min(zoom * 1.1, 3) });
          event.preventDefault();
        }
        break;

      case '-':
        if (!isModifierPressed) {
          const newZoom = Math.max(zoom / 1.1, 0.5);
          dispatch({ type: 'SET_ZOOM', payload: newZoom });
          toast.success(`Zoom ${Math.round(newZoom * 100)}%`);
          event.preventDefault();
        } else if (ctrlKey || metaKey) {
          // Keep existing Ctrl+Minus behavior
          dispatch({ type: 'SET_ZOOM', payload: Math.max(zoom / 1.1, 0.5) });
          event.preventDefault();
        }
        break;

      // Mode switching
      case 'p':
      case 'P':
        if (!isModifierPressed) {
          setMode('pan');
          toast.success('Panning mode activated', {
            description: 'Use left click and drag to pan around the document'
          });
          event.preventDefault();
        }
        break;

      case 's':
      case 'S':
        if (!isModifierPressed) {
          setMode('select');
          toast.success('Selection mode activated', {
            description: 'Click and drag to create selections'
          });
          event.preventDefault();
        }
        break;

      // Info panel toggle
      case 'i':
      case 'I':
        if (!isModifierPressed) {
          toggleInfoPanel();
          event.preventDefault();
        }
        break;

      // Help overlay toggle
      case 'h':
      case 'H':
        if (!isModifierPressed) {
          toggleHelpOverlay();
          event.preventDefault();
        }
        break;

      case ' ': // Spacebar for temporary pan mode
        if (!isModifierPressed && mode === 'select') {
          // TODO: Implement temporary pan mode
          event.preventDefault();
        }
        break;

      case 'g':
      case 'G':
        if (ctrlKey || metaKey) {
          // Show go-to-page dialog
          const pageInput = prompt(
            `Go to page (1-${numPages}):`,
            String(currentPage + 1)
          );
          if (pageInput !== null) {
            const pageNum = parseInt(pageInput.trim());
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
              const newPage = pageNum - 1; // Convert to 0-based
              setCurrentPage(newPage);
              toast.success(`Jumped to page ${pageNum}`);
            } else {
              toast.error(`Invalid page number. Enter a number between 1 and ${numPages}.`);
            }
          }
          event.preventDefault();
        }
        break;

      case 'Delete':
      case 'Backspace':
        if (!isModifierPressed) {
          // Delete the most recent new selection
          if (newSelections.length > 0) {
            const lastIndex = newSelections.length - 1;
            deleteSelection(lastIndex);
            toast.success('Last selection removed');
          } else {
            toast.info('No selections to remove');
          }
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

      case '0':
        if (ctrlKey || metaKey) {
          dispatch({ type: 'RESET_VIEW' });
          event.preventDefault();
        }
        break;
    }
  }, [mode, isPanning, zoom, setIsPanning, cancelSelectionUpdate, endSelection, dispatch, currentPage, numPages, setCurrentPage, setMode, toggleInfoPanel, showHelpOverlay, toggleHelpOverlay, newSelections, deleteSelection]);

  // Attach keyboard and wheel event listeners to document/viewport
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    // Add wheel event listener with passive: false to allow preventDefault
    const viewport = viewportRef.current;
    if (viewport) {
      const wheelHandler = (event: WheelEvent) => {
        event.preventDefault();
        
        if (!viewportRef.current) return;
        
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1; // Zoom out for positive delta, in for negative
        const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));
        
        // Get viewport bounds
        const rect = viewportRef.current.getBoundingClientRect();
        
        // Mouse position relative to viewport center
        const mouseX = event.clientX - rect.left - rect.width / 2;
        const mouseY = event.clientY - rect.top - rect.height / 2;
        
        // Since PDF renders at zoom level, document coordinates are already scaled
        // Current document point under mouse (before zoom) - no division by zoom needed
        const docPointX = mouseX - pan.x;
        const docPointY = mouseY - pan.y;
        
        // Calculate scale factor for the document coordinates
        const scaleFactor = newZoom / zoom;
        
        // Calculate new pan to keep the same document point under mouse (after zoom)
        const newPanX = mouseX - docPointX * scaleFactor;
        const newPanY = mouseY - docPointY * scaleFactor;
        
        // Update zoom and pan simultaneously
        dispatch({ type: 'SET_ZOOM', payload: newZoom });
        setPan({ x: newPanX, y: newPanY });
      };
      
      viewport.addEventListener('wheel', wheelHandler, { passive: false });
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        viewport.removeEventListener('wheel', wheelHandler);
      };
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, zoom, pan, setPan, dispatch]);

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
