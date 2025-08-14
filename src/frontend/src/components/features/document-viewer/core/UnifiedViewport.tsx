import React, { useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useViewerState } from '../hooks/useViewerState';
import {
  type Point,
  clampPan,
} from './CoordinateSystem';

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
  } = useViewerState();
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  // Update viewport bounds reference
  useEffect(() => {
    if (viewportRef.current) {
      // Store reference for coordinate calculations in the unified state
      // The state management will handle viewport bounds calculation
    }
  }, []);

  // Event handling is now managed by UnifiedEventHandler
  // This viewport only handles the visual representation

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
