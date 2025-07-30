import { useState } from "react";

export function useDocumentViewerState() {
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<"pan" | "select">("select");
  const [numPages, setNumPages] = useState(0);

  return {
    numPages,
    setNumPages,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    mode,
    setMode,
  };
}
