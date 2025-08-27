import type React from 'react';
import { useMemo, useRef } from 'react';
import { useViewportState } from '@/components/features/document-viewer/providers/viewport-provider';
import type { ViewportAction } from '../../../providers/viewport-provider';

export interface WheelDeps {
  viewportRef: React.RefObject<HTMLDivElement | null>,
  zoom: number,
  pan: { x: number, y: number },
  setPan: (p: { x: number, y: number }) => void,
  dispatch: React.Dispatch<ViewportAction>,
}

export function createWheelHandler({ viewportRef, zoom, pan, setPan, dispatch }: WheelDeps) {
  return (event: WheelEvent) => {
    event.preventDefault();

    if (!viewportRef.current) return;

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));

    // Get viewport bounds
    const rect = viewportRef.current.getBoundingClientRect();

    // Mouse position relative to viewport center
    const mouseX = event.clientX - rect.left - rect.width / 2;
    const mouseY = event.clientY - rect.top - rect.height / 2;

    // Current document point under mouse (before zoom)
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
}

// Adapter hook: returns a memoized wheel handler wired to viewport state
export function useWheelHandler(viewportRef: React.RefObject<HTMLDivElement | null>) {
  const { zoom, pan, setPan, dispatch } = useViewportState();
  return useMemo(
    () => createWheelHandler({ viewportRef, zoom, pan, setPan, dispatch }),
    [viewportRef, zoom, pan, setPan, dispatch],
  );
}

// Mouse button handlers scaffold
export type MouseEventState = {
  leftButtonDown: boolean,
  middleButtonDown: boolean,
  rightButtonDown: boolean,
  panStart: { x: number, y: number } | null,
  selectionPageIndex: number | null,
  isTemporaryPanning: boolean,
  originalMode: string | null,
};

export interface MouseDeps {
  mode: 'pan' | 'select',
  pan: { x: number, y: number },
  setPan: (p: { x: number, y: number }) => void,
  isPanning: boolean,
  setIsPanning: (v: boolean) => void,
  throttledPanUpdate: (p: { x: number, y: number }) => void,
  eventStateRef: React.MutableRefObject<MouseEventState>,
}

export interface MouseHandlers {
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void,
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void,
  onMouseUp: (event: React.MouseEvent<HTMLDivElement>) => void,
  onMouseLeave: (event: React.MouseEvent<HTMLDivElement>) => void,
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void,
}

export function createMouseButtonHandlers(deps: MouseDeps): MouseHandlers {
  const { mode, pan, setIsPanning, isPanning, throttledPanUpdate, eventStateRef } = deps;

  const onMouseDown: MouseHandlers['onMouseDown'] = (event) => {
    event.preventDefault();

    if (event.button === 0) {
      // Left button
      eventStateRef.current.leftButtonDown = true;

      if (!eventStateRef.current.isTemporaryPanning) {
        if (mode === 'pan') {
          // Left button starts panning in pan mode
          setIsPanning(true);
          eventStateRef.current.panStart = {
            x: event.clientX - pan.x,
            y: event.clientY - pan.y,
          };
        }
        // Selection drawing handled elsewhere
      }
    } else if (event.button === 1) {
      // Middle button
      eventStateRef.current.middleButtonDown = true;
      eventStateRef.current.isTemporaryPanning = true;
      eventStateRef.current.originalMode = mode;

      // Start temporary panning
      setIsPanning(true);
      eventStateRef.current.panStart = {
        x: event.clientX - pan.x,
        y: event.clientY - pan.y,
      };
    } else if (event.button === 2) {
      // Right button
      eventStateRef.current.rightButtonDown = true;
      // Handled in onContextMenu
    }
  };

  const onMouseMove: MouseHandlers['onMouseMove'] = (event) => {
    // Handle temporary panning (middle button)
    if (
      eventStateRef.current.middleButtonDown &&
      eventStateRef.current.isTemporaryPanning &&
      eventStateRef.current.panStart
    ) {
      const newPan = {
        x: event.clientX - eventStateRef.current.panStart.x,
        y: event.clientY - eventStateRef.current.panStart.y,
      };
      throttledPanUpdate(newPan);
      return;
    }

    // Handle regular mode-based interactions
    if (eventStateRef.current.leftButtonDown) {
      if (
        mode === 'pan' &&
        isPanning &&
        eventStateRef.current.panStart &&
        !eventStateRef.current.isTemporaryPanning
      ) {
        const newPan = {
          x: event.clientX - eventStateRef.current.panStart.x,
          y: event.clientY - eventStateRef.current.panStart.y,
        };
        throttledPanUpdate(newPan);
      }
      // Selection drawing handled elsewhere
    }
  };
  const onMouseUp: MouseHandlers['onMouseUp'] = (event) => {
    if (event.button === 0) {
      // Left button
      eventStateRef.current.leftButtonDown = false;

      if (mode === 'pan' && isPanning && !eventStateRef.current.isTemporaryPanning) {
        setIsPanning(false);
      }
      // Clear pan start when finishing drag in non-temporary state
      if (!eventStateRef.current.isTemporaryPanning) {
        eventStateRef.current.panStart = null;
      }
    } else if (event.button === 1) {
      // Middle button
      eventStateRef.current.middleButtonDown = false;

      if (eventStateRef.current.isTemporaryPanning) {
        // End temporary panning
        setIsPanning(false);
        eventStateRef.current.panStart = null;
        eventStateRef.current.isTemporaryPanning = false;
        eventStateRef.current.originalMode = null;
      }
    } else if (event.button === 2) {
      // Right button
      eventStateRef.current.rightButtonDown = false;
    }
  };
  const onMouseLeave: MouseHandlers['onMouseLeave'] = (event) => {
    // Treat mouse leave as mouse up to end any ongoing operations
    onMouseUp(event);
  };
  const onContextMenu: MouseHandlers['onContextMenu'] = (event) => {
    // Prevent default context menu for now; custom menu can be implemented later
    event.preventDefault();
  };

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onContextMenu,
  };
}

// Adapter hook: returns mouse button handlers wired to viewport state and a derived cursor
export function useMouseButtonHandlers(params: {
  throttledPanUpdate: (p: { x: number, y: number }) => void,
}): MouseHandlers & { cursor: string } {
  const { mode, pan, setPan, isPanning, setIsPanning } = useViewportState();
  const eventStateRef = useRef<MouseEventState>({
    leftButtonDown: false,
    middleButtonDown: false,
    rightButtonDown: false,
    panStart: null,
    selectionPageIndex: null,
    isTemporaryPanning: false,
    originalMode: null,
  });

  const handlers = useMemo(
    () =>
      createMouseButtonHandlers({
        mode,
        pan,
        setPan,
        isPanning,
        setIsPanning,
        throttledPanUpdate: params.throttledPanUpdate,
        eventStateRef,
      }),
    [mode, pan, setPan, isPanning, setIsPanning, params.throttledPanUpdate],
  );

  const cursor = useMemo(() => {
    if (eventStateRef.current.isTemporaryPanning || (mode === 'pan' && isPanning)) {
      return 'grabbing';
    }
    if (mode === 'pan') {
      return 'grab';
    }
    return 'default';
  }, [mode, isPanning]);

  return { ...handlers, cursor };
}

