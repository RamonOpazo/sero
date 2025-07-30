import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bolt } from "lucide-react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Hand, MousePointerClick } from "lucide-react";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";

export default function ActionsLayer() {
  const {
    currentPage,
    numPages,
    mode,
    setCurrentPage,
    setZoom,
    setMode,
  } = useDocumentViewerContext();
  return (
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
        onClick={() => setZoom(prev => Math.min(prev + 0.1, 3))}
      >
        <ZoomIn />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
      >
        <ZoomOut />
      </Button>

      {/* Mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMode(mode === "pan" ? "select" : "pan")}
        className="ml-2"
      >
        {mode === "pan" ? <Hand /> : <MousePointerClick />}
      </Button>
    </ActionsLayerContainer>
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
    <div
      id="__actions_layer__"
    >
      {/* Toggle Button */}
      <div className="absolute top-2 right-2 z-1000 bg-muted/80 rounded-md shadow-md">
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
        absolute top-2 left-1/2 -translate-x-1/2 z-1001 bg-muted/80 rounded-md
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