import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SelectionCreateType } from "@/types";
import { useViewerState } from '../hooks/useViewerState';

type Props = { 
  documentSize: { width: number; height: number };
};

export default function SelectionsLayer({ documentSize }: Props) {
  const {
    isRendered,
    showSelections,
    existingSelections,
    newSelections,
    drawing,
    deleteSelection,
  } = useViewerState();

  // State for selection editing
  const [selectedSelection, setSelectedSelection] = useState<{
    type: 'existing' | 'new';
    index: number;
    selection: SelectionCreateType;
  } | null>(null);

  // Handle selection click
  const handleSelectionClick = (
    sel: SelectionCreateType,
    type: 'existing' | 'new',
    index: number
  ) => {
    setSelectedSelection({ type, index, selection: sel });
  };

  // Handle resize handle drag (placeholder for now)
  const handleResizeStart = (_corner: string) => {
    // TODO: Implement resize logic
    console.log('Resize started');
  };

  // Render resize handles
  const renderResizeHandles = () => {
    if (!selectedSelection) return null;

    const handleSize = 6; // Size of the square handles
    const positions = [
      { name: 'nw', style: { top: -handleSize/2, left: -handleSize/2, cursor: 'nw-resize' } },
      { name: 'ne', style: { top: -handleSize/2, right: -handleSize/2, cursor: 'ne-resize' } },
      { name: 'sw', style: { bottom: -handleSize/2, left: -handleSize/2, cursor: 'sw-resize' } },
      { name: 'se', style: { bottom: -handleSize/2, right: -handleSize/2, cursor: 'se-resize' } },
    ];

    return positions.map(({ name, style }) => (
      <div
        key={name}
        className="absolute bg-blue-600 border border-white shadow-sm hover:bg-blue-700"
        style={{
          width: handleSize,
          height: handleSize,
          ...style,
        }}
        onMouseDown={() => handleResizeStart(name)}
      />
    ));
  };

  // Render selection boxes using absolute positioning within the unified transform
  const renderBox = (
    sel: SelectionCreateType,
    isNew: boolean,
    key: string | number,
    index: number,
    deletable = true
  ) => {
    // Convert normalized coordinates to pixel coordinates within the document
    const left = sel.x * documentSize.width;
    const top = sel.y * documentSize.height;
    const width = Math.abs(sel.width) * documentSize.width;
    const height = Math.abs(sel.height) * documentSize.height;

    const isSelected = selectedSelection?.type === (isNew ? 'new' : 'existing') && 
                      selectedSelection?.index === index;

    return (
      <div
        key={key}
        className={cn(
          "absolute pointer-events-auto group transition-all duration-200",
          isSelected
            ? "border border-blue-600 bg-blue-100/20"
            : isNew
              ? "border border-green-400/60 bg-green-50/10 hover:border-green-500/80"
              : "border border-slate-400/60 bg-slate-50/10 hover:border-slate-500/80"
        )}
        style={{ 
          left: `${Math.min(left, left + sel.width * documentSize.width)}px`,
          top: `${Math.min(top, top + sel.height * documentSize.height)}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectionClick(sel, isNew ? 'new' : 'existing', index);
        }}
      >
        {/* Delete button for new selections */}
        {isNew && deletable && (
          <button
            className="absolute -top-2 -right-2 text-xs bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              deleteSelection(index);
            }}
          >
            ×
          </button>
        )}
        
        {/* Resize handles for selected selection */}
        {isSelected && renderResizeHandles()}
      </div>
    );
  };

  // Filter selections for current page
  const currentPageNumber = 1; // TODO: Get from context when multi-page support is added
  const pageExisting = existingSelections.filter(
    s => s.page_number === currentPageNumber
  );
  const pageNew = newSelections.filter(
    s => s.page_number === currentPageNumber
  );
  const drawingThisPage = drawing?.page_number === currentPageNumber ? drawing : null;

  if (!isRendered || !showSelections) {
    return null;
  }

  return (
    <>
      {/* Selection overlay - positioned within the unified transform */}
      <div
        id="__selection_layer__"
        className="absolute inset-0 pointer-events-auto"
        style={{
          width: documentSize.width,
          height: documentSize.height,
        }}
        onClick={() => setSelectedSelection(null)}
      >
        {/* Existing selections from database */}
        {pageExisting.map((sel, i) => renderBox(sel, false, `existing-${i}`, i))}
        
        {/* New selections */}
        {pageNew.map((sel, i) => renderBox(sel, true, `new-${i}`, i))}
        
        {/* Currently drawing selection */}
        {drawingThisPage && renderBox(drawingThisPage, true, "drawing", -1, false)}
      </div>

      {/* No interaction layer needed - handled by UnifiedEventHandler */}
    </>
  );
}
