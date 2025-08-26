import * as React from "react";
import { Progress } from "@/components/ui/progress";

interface AiProgressProps {
  currentStageLabel: string | null;
  stageIndex: number | null;
  stageTotal: number | null;
  stagePercent: number | null;
  processedDocs?: number | null;
  totalDocs?: number | null;
  onCancel?: () => void;
}

export function AiProgress(props: AiProgressProps) {
  const {
    currentStageLabel,
    stageIndex,
    stageTotal,
    stagePercent,
    processedDocs,
    totalDocs,
    onCancel,
  } = props;

  const overallPct = typeof stagePercent === 'number' ? Math.max(0, Math.min(100, stagePercent)) : 0;
  const batchPct = (typeof processedDocs === 'number' && typeof totalDocs === 'number' && totalDocs > 0)
    ? Math.max(0, Math.min(100, (processedDocs / totalDocs) * 100))
    : null;

  return (
    <div className="flex flex-col gap-2 p-2 border rounded bg-muted/30">
      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
        <div className="truncate">
          {stageIndex !== null && stageTotal !== null && currentStageLabel
            ? `Stage ${stageIndex + 1}/${stageTotal}: ${currentStageLabel}`
            : (currentStageLabel ?? 'Processing...')}
        </div>
        {onCancel && (
          <button
            type="button"
            className="px-2 py-0.5 text-[11px] border rounded hover:bg-muted"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
      <Progress value={overallPct} className="h-2" />
      {batchPct !== null && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[11px] text-muted-foreground">
            <div>Documents processed</div>
            <div className="font-mono">{processedDocs}/{totalDocs}</div>
          </div>
          <Progress value={batchPct} className="h-2" />
        </div>
      )}
    </div>
  );
}

