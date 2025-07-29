import { useState } from "react";
import type { SelectionCreate } from "@/types";

export function useSelection(documentId: string) {
  const [newSelections, setNewSelections] = useState<SelectionCreate[]>([]);
  const [drawing, setDrawing] = useState<SelectionCreate | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDraw = (
    e: React.MouseEvent,
    pageIndex: number,
    pageEl: HTMLElement
  ) => {
    const rect = pageEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setDrawing({
      x,
      y,
      width: 0,
      height: 0,
      page_number: pageIndex + 1,
      document_id: documentId,
    });
    setIsDrawing(true);
  };

  const updateDraw = (e: React.MouseEvent, pageEl: HTMLElement) => {
    if (!isDrawing || !drawing) return;

    const rect = pageEl.getBoundingClientRect();
    const x2 = (e.clientX - rect.left) / rect.width;
    const y2 = (e.clientY - rect.top) / rect.height;

    setDrawing(prev =>
      prev
        ? {
            ...prev,
            width: x2 - prev.x,
            height: y2 - prev.y,
          }
        : null
    );
  };

  const endDraw = () => {
    if (
      drawing &&
      Math.abs(drawing.width) > 0.01 &&
      Math.abs(drawing.height) > 0.01
    ) {
      setNewSelections(prev => [...prev, drawing]);
    }
    setDrawing(null);
    setIsDrawing(false);
  };

  const deleteNewSelection = (index: number) => {
    setNewSelections(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  return {
    newSelections,
    drawing,
    isDrawing,
    startDraw,
    updateDraw,
    endDraw,
    deleteNewSelection,
  };
}