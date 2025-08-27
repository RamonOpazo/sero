import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import type { AiProcessingWarning } from '@/providers/ai-processing-provider';

export interface AiProcessingApi {
  state: { jobs: Record<string, any> };
  startJob: (job: any) => void;
  updateJob: (patch: any) => void;
  completeJob: (id: string) => void;
  failJob: (id: string, warning?: AiProcessingWarning) => void;
  clearJob: (id: string) => void;
  registerCancel: (id: string, cancel: () => void) => void;
  cancelJob: (id: string) => void;
}

/**
 * Start a project-level AI run and stream progress into AiProcessingProvider.
 * Returns a cancel function.
 */
export function startProjectRun(aiProc: AiProcessingApi, projectId: string, opts?: { keyId?: string; encryptedPassword?: string }) {
  const jobId = `project:${projectId}`;

  // Initialize job early so users see feedback immediately
  aiProc.startJob({
    id: jobId,
    kind: 'project',
    title: `Project ${projectId}`,
    stage: 'initializing',
    stageIndex: 0,
    stageTotal: 1,
    percent: 0,
    hints: [],
    batchProcessed: 0,
    batchTotal: 0,
    meta: { projectId },
  });

  const ctrl = DocumentViewerAPI.applyAiProjectStream(projectId, {
    onProjectInit: ({ total_documents }: { total_documents: number }) => {
      aiProc.updateJob({ id: jobId, batchTotal: total_documents });
    },
    onProjectProgress: ({ processed, total }: { processed: number; total: number }) => {
      const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
      aiProc.updateJob({ id: jobId, batchProcessed: processed, batchTotal: total, percent: pct });
    },
    onProjectDocStart: ({ index, document_id }: { index: number; document_id: string }) => {
      aiProc.updateJob({ id: jobId, hints: [`doc ${index + 1}${document_id ? `: ${document_id}` : ''}`] });
    },
    onStatus: (d: {
      stage: string;
      stage_index?: number;
      stage_total?: number;
      percent?: number;
      subtask?: string;
      provider_ok?: boolean;
      model_listed?: boolean;
      message?: string;
      document_id?: string;
    }) => {
      // Map document-level status into project job hints and stage
      const sub = d.subtask ? `: ${d.subtask}` : '';
      aiProc.updateJob({
        id: jobId,
        stage: d.stage,
        stageIndex: typeof d.stage_index === 'number' ? d.stage_index : undefined,
        stageTotal: typeof d.stage_total === 'number' ? d.stage_total : undefined,
        percent: typeof d.percent === 'number' ? d.percent : undefined,
        hints: [`${d.stage}${sub}`],
        warning: d.provider_ok === false || d.model_listed === false ? { message: d.message ?? 'Provider/model check failed' } : undefined,
      });
    },
    onProjectDocSummary: ({ staged, returned, filtered_out, document_id }: { staged: number; returned: number; filtered_out: number; document_id: string }) => {
      aiProc.updateJob({ id: jobId, hints: [`doc summary (${document_id ?? 'n/a'}): staged=${staged}, kept=${returned - filtered_out}`] });
    },
    onCompleted: () => {
      aiProc.completeJob(jobId);
      aiProc.clearJob(jobId);
    },
    onError: ({ message }: { message: string }) => {
      aiProc.failJob(jobId, { message: message ?? 'project-run-error' });
      aiProc.clearJob(jobId);
    },
    ...(opts?.keyId && opts?.encryptedPassword ? { keyId: opts.keyId, encryptedPassword: opts.encryptedPassword } : {}),
  } as any);

  aiProc.registerCancel(jobId, ctrl.cancel);
  return { cancel: ctrl.cancel };
}

