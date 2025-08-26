import { GlobalProcessingChin } from './global-processing-chin';
import { useAiProcessing } from '@/providers/ai-processing-provider';

/**
 * Container that bridges provider state to the GlobalProcessingChin UI.
 * Chooses the most recent active job (not done and percent < 100).
 */
export function GlobalProcessingChinContainer() {
  const { state } = useAiProcessing();
  const { order, jobs } = state;

  const activeId = order.find((id) => {
    const j = jobs[id];
    return j && j.percent < 100 && j.stage !== 'done';
  });

  if (!activeId) return null;

  const job = jobs[activeId];
  const batchText =
    job.kind === 'project' && typeof job.batchProcessed === 'number' && typeof job.batchTotal === 'number'
      ? `Documents ${job.batchProcessed} of ${job.batchTotal}`
      : null;

  // Compose a short subtask from hints (last hint)
  const lastHint = job.hints.length > 0 ? job.hints[job.hints.length - 1] : null;

  return (
    <GlobalProcessingChin
      stageIndex={job.stageIndex}
      stageTotal={job.stageTotal}
      stageLabel={job.stage}
      subtask={lastHint}
      warning={job.warning ?? null}
      percent={job.percent}
      batchText={batchText}
      link={job.link ?? null}
    />
  );
}

