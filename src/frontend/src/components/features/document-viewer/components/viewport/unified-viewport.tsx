import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useViewportState } from '../../providers/viewport-provider';
import { useSelections } from '../../providers/selection-provider';
import { useKeyboardHandler, useWheelHandler, useMouseButtonHandlers } from './input';
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
    currentPage,
    setCurrentPage,
  } = useViewportState();
  
  
  // Get selection state from new system
  const {
    setOnNavigateToPage,
  } = useSelections();
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  

  // Throttled pan update for smooth performance
  const throttledPanUpdate = useThrottle((newPan: { x: number; y: number }) => {
    setPan(newPan);
  }, 16); // ~60fps

// Mouse button handlers via adapter hook
  const { onContextMenu, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, cursor } = useMouseButtonHandlers({
    throttledPanUpdate,
  });

  // Keyboard event handling via adapter hook
  const handleKeyDown = useKeyboardHandler();

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

  // Cursor style derived from mouse adapter
  const cursorStyle = React.useMemo(() => cursor, [cursor]);

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
