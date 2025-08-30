import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import type { AiProcessingWarning } from '@/providers/ai-processing-provider';
import { toast } from 'sonner';

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

/**
 * Start a project-level redaction run and stream progress into AiProcessingProvider.
 */
export function startProjectRedaction(
  aiProc: AiProcessingApi,
  projectId: string,
  opts: { keyId: string; encryptedPassword: string; scope: 'project' | 'document' | 'pan'; getFreshCreds?: () => Promise<{ keyId: string; encryptedPassword: string }> },
) {
  const jobId = `redact:${projectId}`;

  // Cancel any previous job for this project to avoid stale UI state and ensure a single active stream
  try { aiProc.cancelJob(jobId); } catch { /* ignore */ }
  try { aiProc.clearJob(jobId); } catch { /* ignore */ }

  aiProc.startJob({
    id: jobId,
    kind: 'project',
    title: `Redaction ${projectId}`,
    stage: 'initializing',
    stageIndex: 0,
    stageTotal: 3,
    percent: 0,
    hints: [],
    batchProcessed: 0,
    batchTotal: 0,
    meta: { projectId },
  });

  // Dynamically import to avoid circular deps; ProjectsAPI is the source for redaction SSE
  const { ProjectsAPI } = require('@/lib/projects-api');
  const handle = ProjectsAPI.redactProjectStream(projectId, {
    scope: opts.scope,
    keyId: opts.keyId,
    encryptedPassword: opts.encryptedPassword,
    getFreshCreds: opts.getFreshCreds,
    onProjectInit: ({ total_documents }: { total_documents: number }) => {
      aiProc.updateJob({ id: jobId, batchTotal: total_documents, stage: 'queued', stageIndex: 0 });
    },
    onProjectProgress: ({ processed, total }: { processed: number; total: number }) => {
      const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
      aiProc.updateJob({ id: jobId, batchProcessed: processed, batchTotal: total, percent: pct });
    },
    onDocStart: ({ index, document_id }: { index: number; document_id: string }) => {
      aiProc.updateJob({ id: jobId, hints: [`doc ${index}${document_id ? `: ${document_id}` : ''}`], stage: 'decrypting', stageIndex: 1 });
    },
    onStatus: ({ stage, document_id }: { stage: string; document_id?: string }) => {
      // Map server stages directly when present
      aiProc.updateJob({ id: jobId, stage, hints: [document_id ? `${stage} (${document_id})` : stage] });
    },
    onDocSummary: ({ ok, document_id, reason, selections_applied }: { ok: boolean; document_id: string; reason?: string; selections_applied?: number }) => {
      const status = ok ? 'saved' : `skipped${reason ? `: ${reason}` : ''}`;
      const hint = `doc ${document_id}: ${status}${typeof selections_applied === 'number' ? ` (${selections_applied})` : ''}`;
      aiProc.updateJob({ id: jobId, hints: [hint], stage: 'saving', stageIndex: 2 });
    },
    onCompleted: ({ ok, total, succeeded, failed }: { ok: boolean; total?: number; succeeded?: number; failed?: number }) => {
      const hasCounts = typeof total === 'number' && typeof succeeded === 'number' && typeof failed === 'number';
      if (ok) {
        aiProc.completeJob(jobId);
        if (hasCounts) {
          toast.success(
            'Redaction completed',
            { description: `${succeeded}/${total} succeeded, ${failed} failed`, },
          );
        } else {
          toast.success('Redaction completed');
        }
      } else {
        aiProc.failJob(jobId, { message: 'redaction-completed-with-errors' });
        if (hasCounts) {
          toast.error(
            'Redaction completed with errors',
            { description: `${succeeded}/${total} succeeded, ${failed} failed`, },
          );
        } else {
          toast.error('Redaction completed with errors');
        }
      }
      aiProc.clearJob(jobId);
    },
    onError: ({ message }: { message: string }) => {
      aiProc.failJob(jobId, { message: message ?? 'redaction-error' });
      aiProc.clearJob(jobId);
    },
  });

  aiProc.registerCancel(jobId, handle.cancel);
  return { cancel: handle.cancel };
}

