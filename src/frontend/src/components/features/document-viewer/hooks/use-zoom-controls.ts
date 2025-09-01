import { useCallback, useEffect, useRef } from "react";
import { useViewportState } from "../providers/viewport-provider";

export function useZoomControls() {
  const { zoom, pan, setPan, dispatch } = useViewportState();

  // Track last mouse position for cursor-aware zooming
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
    };
    globalThis.document.addEventListener('mousemove', handleMouseMove);
    return () => {
      globalThis.document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const zoomBy = useCallback((zoomFactor: number) => {
    const newZoom = zoomFactor > 1
      ? Math.min(zoom * zoomFactor, 3)
      : Math.max(zoom * zoomFactor, 0.5);

    const viewportElement = globalThis.document.querySelector('.unified-viewport');
    if (!viewportElement) {
      const centerX = -pan.x;
      const centerY = -pan.y;
      const scaleFactor = newZoom / zoom;
      const newPanX = -centerX * scaleFactor;
      const newPanY = -centerY * scaleFactor;
      dispatch({ type: 'SET_ZOOM', payload: newZoom });
      setPan({ x: newPanX, y: newPanY });
      return;
    }

    const rect = (viewportElement as HTMLElement).getBoundingClientRect();
    const mouseX = mousePositionRef.current.x - rect.left - rect.width / 2;
    const mouseY = mousePositionRef.current.y - rect.top - rect.height / 2;

    const docPointX = mouseX - pan.x;
    const docPointY = mouseY - pan.y;
    const scaleFactor = newZoom / zoom;
    const newPanX = mouseX - docPointX * scaleFactor;
    const newPanY = mouseY - docPointY * scaleFactor;

    dispatch({ type: 'SET_ZOOM', payload: newZoom });
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan, dispatch, setPan]);

  const zoomIn = useCallback(() => zoomBy(1.1), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(0.9), [zoomBy]);

  return { zoomIn, zoomOut } as const;
}

