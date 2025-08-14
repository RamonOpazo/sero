import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bolt } from "lucide-react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Hand, MousePointerClick, Eye, EyeOff, Scan, Info } from "lucide-react";
import { useViewerState } from './hooks/useViewerState';

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


  return (
    <>
      {/* Mode Toggle Button - Left Side */}
      <div className="absolute top-0 left-0 z-1000 bg-muted/80 rounded-md shadow-md">
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

      <ActionsLayerContainer>
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
        onClick={() => setShowSelections(prev => !prev)}
      >
        {showSelections ? <Eye /> : <EyeOff />}
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
      </ActionsLayerContainer>
    </>
  );
}

function ActionsLayerContainer({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 300); // reset after animation
    setVisible(v => !v);
  };

  return (
    <div id="__actions_layer__">
      {/* Toggle Button */}
      <div className="absolute top-0 right-0 z-1000 bg-muted/80 rounded-md shadow-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
        >
          <Bolt className={`
            ${clicked ? "animate-[scale-bounce_300ms_ease-in-out]" : ""}
          `}/>
          <style>
            {`
              @keyframes scale-bounce {
                0% { transform: scale(1); }
                30% { transform: scale(0.9); }
                60% { transform: scale(1.1); }
                100% { transform: scale(1); }
            `}
            </style>
        </Button>
      </div>

      {/* Actions Panel */}
      <div className={`
        absolute top-0 left-1/2 -translate-x-1/2 z-1001 bg-muted/80 rounded-md
        transition-all duration-300 ease-in-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}
      `}>
        <div className="shadow-md flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}