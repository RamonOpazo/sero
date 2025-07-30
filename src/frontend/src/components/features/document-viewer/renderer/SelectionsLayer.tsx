import { usePDFContext } from "@/context/PDFContext";
import { useDocumentViewerContext } from "@/context/DocumentViewerContext";
import { useSelection } from "@/hooks/useSelections";
import { cn } from "@/lib/utils";
import type { Document as DocumentType, SelectionCreate as SelectionCreateType } from "@/types";
import { useLayoutEffect, useState, useEffect } from "react";

type Props = { document: DocumentType };

interface PageRect {
  pageIndex: number;
  rect: DOMRect;
}

export default function SelectionsLayer({ document }: Props) {
  const { pageRefs, isRendered } = usePDFContext();
  const { mode, isPanning, documentContainer, showSelections } = useDocumentViewerContext();
  const {
    newSelections,
    drawing,
    startDraw,
    updateDraw,
    endDraw,
    deleteNewSelection,
  } = useSelection(document.id);

  const [pageRects, setPageRects] = useState<PageRect[]>([]);

  useLayoutEffect(() => {
    if (isRendered && !isPanning && showSelections) {
      const newRects: PageRect[] = [];
      pageRefs.current.forEach((ref, pageIndex) => {
        if (ref) {
          newRects.push({
            pageIndex,
            rect: ref.getBoundingClientRect(),
          });
        }
      });
      setPageRects(newRects);
    }
  }, [isRendered, isPanning, showSelections, pageRefs]);

  useEffect(() => {
    if (documentContainer) {
      const handleTransitionEnd = () => {
        if (!isPanning) {
          const newRects: PageRect[] = [];
          pageRefs.current.forEach((ref, pageIndex) => {
            if (ref) {
              newRects.push({
                pageIndex,
                rect: ref.getBoundingClientRect(),
              });
            }
          });
          setPageRects(newRects);
        }
      };
      documentContainer.addEventListener("transitionend", handleTransitionEnd);
      return () => {
        documentContainer.removeEventListener("transitionend", handleTransitionEnd);
      };
    }
  }, [documentContainer, isPanning, pageRefs]);

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
      {isRendered && !isPanning && showSelections && pageRects.map(({ pageIndex, rect }) => {
        const pageExisting = document.selections.filter(
          s => s.page_number === pageIndex + 1
        );
        const pageNew = newSelections.filter(
          s => s.page_number === pageIndex + 1
        );
        const drawingThisPage =
          drawing?.page_number === pageIndex + 1 ? drawing : null;

        const ref = pageRefs.current.get(pageIndex);
        if (!ref) return null; // Should not happen if pageRects is correctly populated

        return (
          <div
            key={pageIndex}
            className={cn(
              "absolute z-10",
              drawingThisPage && "user-select-none"
            )}
            style={{
              top: rect.top,
              left: rect.left,
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
