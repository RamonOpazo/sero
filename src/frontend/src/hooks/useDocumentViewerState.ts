import { useState } from "react";

export function useDocumentViewerState() {
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<"pan" | "select">("select");
  const [numPages, setNumPages] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [documentContainer, setDocumentContainer] = useState<HTMLElement | null>(null);
  const [showSelections, setShowSelectionsState] = useState(true);
  const [userPreferredShowSelections, setUserPreferredShowSelections] = useState(true);

  const setShowSelections = (value: boolean | ((prevState: boolean) => boolean)) => {
    setShowSelectionsState(value);
    setUserPreferredShowSelections(value);
  };

  return {
    numPages,
    setNumPages,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    mode,
    setMode,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    documentContainer,
    setDocumentContainer,
    showSelections,
    setShowSelections,
    userPreferredShowSelections,
  };
}
