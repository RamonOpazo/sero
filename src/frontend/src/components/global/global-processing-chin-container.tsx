import { GlobalProcessingChin } from './global-processing-chin';
import { useAiProcessing } from '@/providers/ai-processing-provider';

/**
 * Container that bridges provider state to the GlobalProcessingChin UI.
 * Chooses the most recent active job (not done and percent < 100).
 */
export function GlobalProcessingChinContainer() {
  const aiProc = useAiProcessing();
  const { order, jobs } = aiProc.state;

  const activeId = order.find((id) => {
    const j = jobs[id];
    return j && j.percent < 100 && j.stage !== 'done';
  });

  if (!activeId) return null;

  const job = jobs[activeId];
  const hasBatch = job.kind === 'project' && typeof job.batchProcessed === 'number' && typeof job.batchTotal === 'number';
  const m = job.meta || {};
  const curIdx = typeof m.currentDocIndex === 'number' ? m.currentDocIndex : (hasBatch ? job.batchProcessed : null);
  const total = typeof m.totalDocs === 'number' && m.totalDocs > 0 ? m.totalDocs : (hasBatch ? job.batchTotal : null);
  const batchText = hasBatch ? `Documents ${job.batchProcessed} of ${job.batchTotal}` : null;
  const docProgressPercent = total && curIdx !== null && curIdx !== undefined && total > 0 ? Math.round((curIdx / total) * 100) : null;
  const docProgressLabel = total && curIdx !== null ? `Document ${curIdx} of ${total}` : null;

  // Compose a short subtask from hints (last hint)
  const lastHint = job.hints.length > 0 ? job.hints[job.hints.length - 1] : null;

  const handleCancel = () => {
    aiProc.cancelJob(activeId);
    aiProc.clearJob(activeId);
  };

  return (
    <GlobalProcessingChin
      stageIndex={job.stageIndex}
      stageTotal={job.stageTotal}
      stageLabel={job.stage}
      subtask={lastHint}
      warning={job.warning ?? null}
      percent={job.percent}
      batchText={batchText}
      docProgressPercent={docProgressPercent}
      docProgressLabel={docProgressLabel}
      link={job.link ?? null}
      onCancel={handleCancel}
      cancelLabel={job.kind === 'project' ? 'Cancel project' : 'Cancel'}
    />
  );
}

