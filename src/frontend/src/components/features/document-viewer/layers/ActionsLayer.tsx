import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Hand, MousePointerClick, Eye, EyeOff, Scan, Info, Square } from "lucide-react";
import { useViewerState } from '../hooks/useViewerState';

interface ActionsLayerProps {
  isInfoVisible?: boolean;
  onToggleInfo?: () => void;
}

export default function ActionsLayer({ isInfoVisible = false, onToggleInfo }: ActionsLayerProps = {}) {
  const {
    currentPage,
    numPages,
    mode,
    zoom,
    pan,
    setPan,
    setCurrentPage,
    setMode,
    showSelections,
    setShowSelections,
    toggleSelections,
    resetView,
    dispatch,
  } = useViewerState();

  // Track last mouse position for button-based zooming
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track temporary panning state for mode indicator
  const [isTemporaryPanning, setIsTemporaryPanning] = useState(false);

  // Update mouse position and track middle button for temporary panning
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 1) { // Middle button
        setIsTemporaryPanning(true);
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 1) { // Middle button
        setIsTemporaryPanning(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleModeToggle = () => {
    if (mode === "pan") {
      setMode("select");
      setShowSelections(true);
    } else {
      setMode("pan");
      setShowSelections(false);
    }
  };

  const handleResetView = () => {
    resetView()
    setMode("pan");
    setShowSelections(false);
  }

  // Mouse-position-aware zoom handlers for button clicks
  const performZoom = useCallback((zoomFactor: number) => {
    const newZoom = zoomFactor > 1
      ? Math.min(zoom * zoomFactor, 3)
      : Math.max(zoom * zoomFactor, 0.5);

    // Find the viewport element (the unified viewport container)
    const viewportElement = document.querySelector('.unified-viewport');
    if (!viewportElement) {
      // Fallback to center-based zoom if viewport not found
      const centerX = -pan.x;
      const centerY = -pan.y;
      const scaleFactor = newZoom / zoom;
      const newPanX = -centerX * scaleFactor;
      const newPanY = -centerY * scaleFactor;

      dispatch({ type: 'SET_ZOOM', payload: newZoom });
      setPan({ x: newPanX, y: newPanY });
      return;
    }

    // Get viewport bounds
    const rect = viewportElement.getBoundingClientRect();

    // Mouse position relative to viewport center
    const mouseX = mousePositionRef.current.x - rect.left - rect.width / 2;
    const mouseY = mousePositionRef.current.y - rect.top - rect.height / 2;

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
  }, [zoom, pan, dispatch, setPan]);

  const handleZoomIn = useCallback(() => {
    performZoom(1.1);
  }, [performZoom]);

  const handleZoomOut = useCallback(() => {
    performZoom(0.9);
  }, [performZoom]);


  // State for auto-hide behavior
  const [visible, setVisible] = useState(true); // Start visible
  const [showBar, setShowBar] = useState(true); // Controls if bar appears at all
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse movement in render layer to show/hide UI with delay
  useEffect(() => {
    const handleRenderLayerMouseEnter = () => {
      if (!showBar) return; // If bar is disabled, don't show anything
      
      // Show the UI immediately when entering render layer
      setVisible(true);
      
      // Clear existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // Set new timeout to hide after 1 second
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 1000);
    };

    // Find the render layer element and add mouse enter listener
    const renderLayer = document.querySelector('[data-slot="document-viewer-renderer"]');
    if (renderLayer) {
      renderLayer.addEventListener('mouseenter', handleRenderLayerMouseEnter);
      
      // Also handle mouse movement within render layer to reset timer
      const handleRenderLayerMouseMove = () => {
        if (!showBar) return;
        
        setVisible(true);
        
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false);
        }, 1000);
      };
      
      renderLayer.addEventListener('mousemove', handleRenderLayerMouseMove);
      
      return () => {
        renderLayer.removeEventListener('mouseenter', handleRenderLayerMouseEnter);
        renderLayer.removeEventListener('mousemove', handleRenderLayerMouseMove);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      };
    }
    
    // Initial timeout to hide after 1 second if no movement and bar is enabled
    if (showBar) {
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 1000);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [showBar]);

  // Handle show/hide bar toggle
  const handleBarToggle = () => {
    const newShowBar = !showBar;
    setShowBar(newShowBar);
    
    if (newShowBar) {
      // If enabling bar, show it and start auto-hide timer
      setVisible(true);
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 1000);
    } else {
      // If disabling bar, hide it completely and clear any timers
      setVisible(false);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }
  };

  return (
    <div id="__actions_layer__">
      {/* Mode Toggle Button - Left Side */}
      <div className="absolute top-4 left-4 z-1000 bg-muted/80 rounded-md shadow-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleModeToggle}
          className={(mode === "pan" || isTemporaryPanning) ? 'bg-accent text-accent-foreground' : ''}
          title={
            isTemporaryPanning
              ? "Temporary Pan Mode (Middle Button)"
              : mode === "pan"
                ? "Pan Mode - Click to switch to Select"
                : "Select Mode - Click to switch to Pan"
          }
        >
          {/* Show hand icon if in pan mode OR temporarily panning */}
          {(mode === "pan" || isTemporaryPanning) ? <Hand /> : <MousePointerClick />}
        </Button>
      </div>

      {/* Show/Hide Bar Toggle Button - Right Side */}
      <div className="absolute top-4 right-4 z-1000 bg-muted/80 rounded-md shadow-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBarToggle}
          title={showBar ? "Hide control bar" : "Show control bar"}
        >
          {showBar ? <Eye /> : <EyeOff />}
        </Button>
      </div>

      {/* Main Control Bar - Center */}
      <div className={`
        absolute top-4 left-1/2 -translate-x-1/2 z-1001 bg-muted/80 rounded-md
        transition-all duration-300 ease-in-out
        ${(visible && showBar) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}
      `}>
        <div className="shadow-md flex items-center gap-2">
          {/* Pagination */}
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage + 1 <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm font-medium w-24 text-center">
            Page {currentPage + 1} of {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage + 1 >= numPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <ChevronRight />
          </Button>

          {/* Zoom */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
          >
            <ZoomIn />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetView}
          >
            <Scan />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
          >
            <ZoomOut />
          </Button>

          {/* Selections visibility toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSelections}
            className={showSelections ? 'bg-accent text-accent-foreground' : ''}
            title={showSelections ? "Hide selections" : "Show selections"}
          >
            <Square />
          </Button>

          {/* Info panel toggle */}
          {onToggleInfo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleInfo}
              className={isInfoVisible ? 'bg-accent text-accent-foreground' : ''}
            >
              <Info />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
