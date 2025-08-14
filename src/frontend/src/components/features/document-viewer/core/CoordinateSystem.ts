/**
 * Coordinate System Utilities for Unified Document Viewer
 * 
 * Provides utilities for converting between different coordinate spaces:
 * - Screen coordinates (mouse events)
 * - Viewport coordinates (container space)
 * - Document coordinates (normalized 0-1 space)
 */

export interface Point {
  x: number;
  y: number;
}

export interface ViewerTransform {
  pan: Point;
  zoom: number;
}

export interface ViewportBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Convert screen coordinates to viewport coordinates
 */
export const screenToViewport = (
  screenPoint: Point,
  viewportBounds: ViewportBounds
): Point => {
  return {
    x: screenPoint.x - viewportBounds.left,
    y: screenPoint.y - viewportBounds.top,
  };
};

/**
 * Convert viewport coordinates to document coordinates (normalized 0-1)
 */
export const viewportToDocument = (
  viewportPoint: Point,
  transform: ViewerTransform,
  documentSize: { width: number; height: number }
): Point => {
  // Account for pan and zoom
  const documentX = (viewportPoint.x - transform.pan.x) / transform.zoom;
  const documentY = (viewportPoint.y - transform.pan.y) / transform.zoom;
  
  // Normalize to 0-1 space
  return {
    x: documentX / documentSize.width,
    y: documentY / documentSize.height,
  };
};

/**
 * Convert document coordinates (normalized 0-1) to viewport coordinates
 */
export const documentToViewport = (
  documentPoint: Point,
  transform: ViewerTransform,
  documentSize: { width: number; height: number }
): Point => {
  // Convert from normalized space to pixel space
  const pixelX = documentPoint.x * documentSize.width;
  const pixelY = documentPoint.y * documentSize.height;
  
  // Apply zoom and pan
  return {
    x: pixelX * transform.zoom + transform.pan.x,
    y: pixelY * transform.zoom + transform.pan.y,
  };
};

/**
 * Convert screen coordinates directly to document coordinates
 */
export const screenToDocument = (
  screenPoint: Point,
  viewportBounds: ViewportBounds,
  transform: ViewerTransform,
  documentSize: { width: number; height: number }
): Point => {
  const viewportPoint = screenToViewport(screenPoint, viewportBounds);
  return viewportToDocument(viewportPoint, transform, documentSize);
};

/**
 * Calculate the visible document bounds in normalized coordinates
 */
export const getVisibleDocumentBounds = (
  viewportBounds: ViewportBounds,
  transform: ViewerTransform,
  documentSize: { width: number; height: number }
): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} => {
  const topLeft = viewportToDocument(
    { x: 0, y: 0 },
    transform,
    documentSize
  );
  const bottomRight = viewportToDocument(
    { x: viewportBounds.width, y: viewportBounds.height },
    transform,
    documentSize
  );

  return {
    left: Math.max(0, topLeft.x),
    top: Math.max(0, topLeft.y),
    right: Math.min(1, bottomRight.x),
    bottom: Math.min(1, bottomRight.y),
  };
};

/**
 * Check if a normalized rectangle is visible in the current viewport
 */
export const isRectangleVisible = (
  rect: { x: number; y: number; width: number; height: number },
  visibleBounds: ReturnType<typeof getVisibleDocumentBounds>
): boolean => {
  const rectLeft = rect.x;
  const rectTop = rect.y;
  const rectRight = rect.x + rect.width;
  const rectBottom = rect.y + rect.height;

  return !(
    rectRight < visibleBounds.left ||
    rectLeft > visibleBounds.right ||
    rectBottom < visibleBounds.top ||
    rectTop > visibleBounds.bottom
  );
};

/**
 * Clamp pan values to keep document within reasonable bounds
 */
export const clampPan = (
  pan: Point,
  zoom: number,
  viewportSize: { width: number; height: number },
  documentSize: { width: number; height: number },
  maxOverpan: number = 100
): Point => {
  const scaledDocumentWidth = documentSize.width * zoom;
  const scaledDocumentHeight = documentSize.height * zoom;

  const minPanX = viewportSize.width - scaledDocumentWidth - maxOverpan;
  const maxPanX = maxOverpan;
  const minPanY = viewportSize.height - scaledDocumentHeight - maxOverpan;
  const maxPanY = maxOverpan;

  return {
    x: Math.max(minPanX, Math.min(maxPanX, pan.x)),
    y: Math.max(minPanY, Math.min(maxPanY, pan.y)),
  };
};

/**
 * Calculate center position for fitting document to viewport
 */
export const calculateCenterFit = (
  viewportSize: { width: number; height: number },
  documentSize: { width: number; height: number },
  padding: number = 50
): ViewerTransform => {
  const availableWidth = viewportSize.width - padding * 2;
  const availableHeight = viewportSize.height - padding * 2;
  
  const scaleX = availableWidth / documentSize.width;
  const scaleY = availableHeight / documentSize.height;
  const zoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
  
  const scaledWidth = documentSize.width * zoom;
  const scaledHeight = documentSize.height * zoom;
  
  const panX = (viewportSize.width - scaledWidth) / 2;
  const panY = (viewportSize.height - scaledHeight) / 2;
  
  return {
    pan: { x: panX, y: panY },
    zoom,
  };
};
