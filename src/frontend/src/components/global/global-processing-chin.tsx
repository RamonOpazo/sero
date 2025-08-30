import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface GlobalProcessingChinProps {
  stageIndex?: number | null;
  stageTotal?: number | null;
  stageLabel?: string | null;
  subtask?: string | null;
  warning?: { message: string } | null;
  percent?: number | null; // 0..100 (stage progress)
  batchText?: string | null; // e.g., "Documents 2 of 10"
  // New: explicit document-level progress
  docProgressPercent?: number | null; // 0..100 (document iteration progress)
  docProgressLabel?: string | null; // e.g., "Document 2 of 10"
  link?: string | null;
  onClickLink?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

/**
 * GlobalProcessingChin
 *
 * A very shallow full-width bar (1.5rem tall) that sits at the bottom of the screen,
 * outside the main sidebar/content layout. From left to right:
 * - milestone number / total, milestone name, subtask, warning slot, progress bar.
 *
 * NOTE: This is a UI skeleton; wiring to provider comes in later subtasks.
 */
export function GlobalProcessingChin(props: GlobalProcessingChinProps) {
  const stageIndex = props.stageIndex ?? null;
  const stageTotal = props.stageTotal ?? null;
  const stageLabel = props.stageLabel ?? null;
  const subtask = props.subtask ?? null;
  const warning = props.warning ?? null;
  const percent = typeof props.percent === 'number' ? Math.max(0, Math.min(100, props.percent as number)) : null;
  const batchText = props.batchText ?? null;
  const docProgressPercent = typeof props.docProgressPercent === 'number' ? Math.max(0, Math.min(100, props.docProgressPercent as number)) : null;
  const docProgressLabel = props.docProgressLabel ?? null;

  // Hide when no data provided (skeleton mode without wiring)
  if (stageIndex === null || stageTotal === null || percent === null) return null;

  return (
    <div data-slot="processing-chin" className="h-14 border-t bg-background/80 supports-[backdrop-filter]:backdrop-blur shrink-0">
      <div className="mx-auto max-w-[1920px] h-full flex items-start gap-3 px-3 text-[11px] py-1">
        {/* Left block: meta text */}
        <div className="flex min-w-0 items-start gap-3 grow">
          {/* Milestone index/total */}
          <div className="shrink-0 tabular-nums text-muted-foreground">
            [ {stageIndex + 1} / {stageTotal} ]
          </div>
          {/* Labels stack */}
          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-3 min-w-0">
              {/* Milestone name */}
              <div className="shrink-0 truncate" title={stageLabel ?? undefined}>
                <span className="text-muted-foreground">milestone:</span> {stageLabel ?? ''}
              </div>
              {/* Subtask */}
              {subtask ? (
                <div className="shrink-0 truncate text-muted-foreground" title={subtask}>
                  {subtask}
                </div>
              ) : null}
              {/* Batch text (project runs) */}
              {batchText ? (
                <div className="shrink-0 truncate text-muted-foreground">{batchText}</div>
              ) : null}
              {/* Warning slot */}
              {warning ? (
                <div className="shrink-0 px-2 py-0.5 rounded border border-amber-300 bg-amber-100/50 text-amber-700" title={warning.message}>
                  {warning.message}
                </div>
              ) : null}
            </div>
            {/* Document progress label (optional) */}
            {docProgressLabel ? (
              <div className="text-muted-foreground truncate">{docProgressLabel}</div>
            ) : null}
          </div>
        </div>

        {/* Right block: progress bars + controls */}
        <div className="shrink-0 flex flex-col items-end gap-1 w-56">
          {/* Stage Progress */}
          <Progress value={percent} className="h-2 w-full" />
          {/* Document Progress (optional) */}
          {docProgressPercent !== null ? (
            <Progress value={docProgressPercent} className="h-2 w-full" />
          ) : null}

          {/* Action row */}
          <div className="flex items-center gap-2">
            {/* Details link (optional) */}
            {props.link ? (
              <button
                type="button"
                onClick={props.onClickLink}
                className="shrink-0 underline text-muted-foreground hover:text-foreground"
              >
                View details
              </button>
            ) : null}
            {/* Cancel button (optional) */}
            {props.onCancel ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 py-0 text-[11px]"
                onClick={props.onCancel}
              >
                {props.cancelLabel ?? 'Cancel'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

