// import { useState, useEffect } from "react";
import { usePDFContext } from "@/context/PDFContext";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";
import { useSelection } from "@/components/features/document-viewer/hooks/useSelections";
import { cn } from "@/lib/utils";
import type { Document as DocumentType, SelectionCreate as SelectionCreateType } from "@/types";

type Props = { document: DocumentType };

export default function SelectionsLayer({ document }: Props) {
  const { pageRefs } = usePDFContext();
  // const { mode, currentPage } = useDocumentViewerContext();
  const { mode } = useDocumentViewerContext();
  const {
    newSelections,
    drawing,
    startDraw,
    updateDraw,
    endDraw,
    deleteNewSelection,
  } = useSelection(document.id);

  // const [boundingBox, setBoundingBox] = useState<DOMRect | null>(null);

  // useEffect(() => {
  //   const el = pageRefs.current[currentPage];
  //   if (!el) return;
  
  //   const rect = el.getBoundingClientRect();
  //   setBoundingBox(rect);
  // }, [currentPage, pageRefs.current[currentPage], document.selections.length]);
  

  const renderBox = (
    sel: SelectionCreateType,
    isNew: boolean,
    key: string | number,
    deletable = true
  ) => {
    const left = `${Math.min(sel.x, sel.x + sel.width) * 100}%`;
    const top = `${Math.min(sel.y, sel.y + sel.height) * 100}%`;
    const width = `${Math.abs(sel.width) * 100}%`;
    const height = `${Math.abs(sel.height) * 100}%`;

    return (
      <div
        key={key}
        className={cn(
          "absolute border-1",
          isNew
            ? "border-green-500 bg-green-300/30"
            : "border-blue-500 bg-blue-300/30"
        )}
        style={{ left, top, width, height }}
      >
        {isNew && deletable && (
          <button
            className="absolute top-0 right-0 text-xs bg-red-600 text-white px-1 rounded-bl"
            onClick={() => deleteNewSelection(key as number)}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      id="__selection_layer__"
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {Array.from(pageRefs.current.entries()).map(([pageIndex, ref]) => {
        if (!ref) return null;

        const pageExisting = document.selections.filter(
          s => s.page_number === pageIndex + 1
        );
        const pageNew = newSelections.filter(
          s => s.page_number === pageIndex + 1
        );
        const drawingThisPage =
          drawing?.page_number === pageIndex + 1 ? drawing : null;

        const rect = ref.getBoundingClientRect();

        return (
          <div
            key={pageIndex}
            className={cn(
              "absolute z-10",
              drawingThisPage && "user-select-none"
            )}
            style={{
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
              height: rect.height,
              pointerEvents: mode === "select" ? "auto" : "none",
              cursor: mode === "select" ? "crosshair" : "default",
            }}
            onMouseDown={e => mode === "select" && startDraw(e, pageIndex, ref)}
            onMouseMove={e => mode === "select" && updateDraw(e, ref)}
            onMouseUp={endDraw}
          >
            {pageExisting.map((sel, i) => renderBox(sel, false, i))}
            {pageNew.map((sel, i) => renderBox(sel, true, i))}
            {drawingThisPage && renderBox(drawingThisPage, true, "drawing", false)}
          </div>
        );
      })}
    </div>
  );
}
