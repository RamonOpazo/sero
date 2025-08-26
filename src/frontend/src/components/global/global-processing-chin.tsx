import { Progress } from '@/components/ui/progress';

interface GlobalProcessingChinProps {
  stageIndex?: number | null;
  stageTotal?: number | null;
  stageLabel?: string | null;
  subtask?: string | null;
  warning?: { message: string } | null;
  percent?: number | null; // 0..100
  batchText?: string | null; // e.g., "Documents 2 of 10"
  link?: string | null;
  onClickLink?: () => void;
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

  // Hide when no data provided (skeleton mode without wiring)
  if (stageIndex === null || stageTotal === null || percent === null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-6 border-t bg-background/80 supports-[backdrop-filter]:backdrop-blur">
      <div className="mx-auto max-w-[1920px] h-full flex items-center gap-3 px-3 text-[11px]">
        {/* Milestone index/total */}
        <div className="shrink-0 tabular-nums text-muted-foreground">
          {stageIndex + 1}/{stageTotal}
        </div>
        {/* Milestone name */}
        <div className="shrink-0 truncate" title={stageLabel ?? undefined}>
          {stageLabel ?? ''}
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
        {/* Spacer */}
        <div className="grow" />
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
        {/* Progress Bar */}
        <div className="shrink-0 w-48">
          <Progress value={percent} className="h-2" />
        </div>
      </div>
    </div>
  );
}

