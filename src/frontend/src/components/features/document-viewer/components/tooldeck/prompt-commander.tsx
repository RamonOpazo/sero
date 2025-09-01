import { Button } from "@/components/ui/button";
import { Trash2, Plus, Hourglass, Bot } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { MinimalDocumentType } from "@/types";
import { FormConfirmationDialog } from "@/components/shared";
import { SimpleConfirmationDialog } from "@/components/shared/simple-confirmation-dialog/simple-confirmation-dialog";
import { usePrompts } from "../../providers/prompts-provider";
import { useSelections } from "../../providers/selections-provider";
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import { useAiProcessing } from '@/providers/ai-processing-provider';
import { useProjectTrust } from '@/providers/project-trust-provider';

interface PromptControlsProps {
  document: MinimalDocumentType;
}

/**
 * Prompt controls component
 * Manages prompt visibility, saving, and clearing operations
 */
export default function PromptManagement({ document }: PromptControlsProps) {
  const {
    state,
    load,
    save,
    createPrompt,
    allPrompts,
  } = usePrompts();
  
  const { state: selectionStateDV } = useSelections() as any;
  const aiProc = useAiProcessing();
  
  const isSaving = (state as any).isSaving || false;
  const isLoading = (state as any).isLoading || false;
  const isDeleting = (state as any).isDeleting || false;
  const error = (state as any).error || null;
  const isAnyOperationInProgress = !!(isSaving || isLoading || isDeleting);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ returned: number; filtered_out: number; staged: number; min_confidence: number } | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Password dialog state for AI
  const { ensureProjectTrust } = useProjectTrust();
  
  // Load prompts when component mounts
  useEffect(() => {
    load();
  }, [load]);


  // Add new rule locally (not saved to server until saveAllChanges is called)
  // Declarative create handler
  const handleCreatePromptSubmit = useCallback(async (values: Record<string, any>) => {
    const title = String(values.title ?? '').trim();
    const directive = String(values.directive ?? '').trim();
    const promptBody = String(values.prompt ?? '').trim();
    if (!title || !promptBody || !directive) {
      toast.error('Please fill in title, directive, and prompt');
      throw new Error('validation');
    }

    const promptData = {
      title,
      directive,
      prompt: promptBody,
      state: 'committed',
      scope: 'document',
    } as any;

    createPrompt(promptData);
    const res = await save();
    if (!res.ok) {
      toast.error('Failed to create prompt');
      throw new Error('api');
    }

    toast.success(`${title} rule created and committed`);
    setShowAddDialog(false);
  }, [createPrompt, save]);

  // Runner using credentials
  const handleRunAIDetectionWithCredentials = useCallback(async (keyId?: string, encryptedPassword?: string) => {
    try {
      setIsApplyingAI(true);
      setAiSummary(null);

      // Start global job in provider
      aiProc.startJob({
        id: document.id,
        kind: 'document',
        title: document.name ?? 'Document',
        stage: 'initializing',
        stageIndex: 0,
        stageTotal: 1,
        percent: 0,
        hints: [],
        meta: { documentId: document.id },
      });

      const ctrl = DocumentViewerAPI.applyAiStream(document.id, {
        onStatus: (d: any) => {
          // Provider: map status to job update
          aiProc.updateJob({
            id: document.id,
            stage: d.stage,
            stageIndex: typeof d.stage_index === 'number' ? d.stage_index : 0,
            stageTotal: typeof d.stage_total === 'number' ? d.stage_total : (aiProc.state.jobs[document.id]?.stageTotal ?? 1),
            percent: typeof d.percent === 'number' ? d.percent : (aiProc.state.jobs[document.id]?.percent ?? 0),
            hints: d.subtask ? [d.subtask] : [],
            warning: d.provider_ok === false || d.model_listed === false ? { message: d.message ?? 'Provider/model check failed' } : undefined,
          });
        },
        onModel: (m: any) => {
          aiProc.updateJob({ id: document.id, hints: [`model: ${m.name}`] });
        },
        onTokens: (_t: any) => {
          aiProc.updateJob({ id: document.id, stage: 'generating' });
        },
        onStagingProgress: (sp: any) => {
          aiProc.updateJob({ id: document.id, percent: typeof sp.percent === 'number' ? sp.percent : undefined as any });
        },
        onSummary: async (s: any) => {
          setAiSummary(s);
          aiProc.updateJob({ id: document.id, hints: [`staged: ${s.staged}`] });
          if (typeof (selectionStateDV as any).reload === 'function') {
            await (selectionStateDV as any).reload();
          }
        },
        onCompleted: () => {
          setIsApplyingAI(false);
          aiProc.completeJob(document.id);
          const s = aiSummary;
          if (s) {
            const count = s.staged;
            const plural = count === 1 ? '' : 's';
            toast.success(`AI generated ${count} selection${plural} (staged) – filtered ${s.filtered_out} of ${s.returned}`);
          } else {
            toast.success('AI completed');
          }
          // Optionally clear to remove from list
          aiProc.clearJob(document.id);
        },
        onError: (e: any) => {
          setIsApplyingAI(false);
          aiProc.failJob(document.id, { message: e.message ?? 'unknown' });
          toast.error(`AI error: ${e.message ?? 'unknown'}`);
          aiProc.clearJob(document.id);
        },
        ...(keyId && encryptedPassword ? { keyId, encryptedPassword } : {}),
      } as any);
      cancelRef.current = ctrl.cancel;
      aiProc.registerCancel(document.id, ctrl.cancel);
    } catch (err) {
      setIsApplyingAI(false);
      toast.error('Failed to run AI detection');
    }
  }, [document.id, document.name, selectionStateDV, aiProc, aiSummary]);

  // Start AI: ensure credentials then run
  const handleStartAI = useCallback(async () => {
    try {
      const { keyId, encryptedPassword } = await ensureProjectTrust(document.project_id);
      await handleRunAIDetectionWithCredentials(keyId, encryptedPassword);
    } catch (e) {
      // user cancelled or encryption failed
      if ((e as any)?.message !== 'validation') {
        // suppress validation errors already toasted elsewhere
      }
    }
  }, [document.project_id, ensureProjectTrust, handleRunAIDetectionWithCredentials]);

  // Clear all prompts
  const handleClearAll = useCallback(() => {
    if ((allPrompts?.length ?? 0) === 0) {
      toast.info('No prompts to clear');
      return;
    }
    setShowClearAllDialog(true);
  }, [allPrompts?.length]);

  const handleOpenAddDialog = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setShowAddDialog(false);
  }, []);



  if (error) {
    return (
      <div className="text-xs text-destructive p-3 border border-destructive/20 bg-destructive/5 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Action Controls */}
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="sm"
        onClick={handleStartAI}
          disabled={isAnyOperationInProgress || isApplyingAI}
          className="w-full justify-start h-9 text-xs"
        >
          {isApplyingAI ? (
            <Hourglass className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Bot className="mr-2 h-3 w-3" />
          )}
          {isApplyingAI ? 'Running AI...' : 'Run AI Detection'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenAddDialog}
          disabled={isAnyOperationInProgress}
          className="w-full justify-start h-9 text-xs"
        >
          <Plus className="mr-2 h-3 w-3" />
          Add Rule
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAll}
          disabled={(allPrompts?.length ?? 0) === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Clear all rules
        </Button>
      </div>

      {/* Confirm Clear All Rules dialog */}
      <SimpleConfirmationDialog
        isOpen={showClearAllDialog}
        onClose={() => setShowClearAllDialog(false)}
        onConfirm={async () => {
          try {
            const res = await DocumentViewerAPI.clearDocumentPrompts(document.id);
            if (res.ok) {
              await load();
              toast.success('All rules cleared');
            } else {
              throw new Error('api');
            }
          } catch (e) {
            toast.error('Failed to clear all rules');
            throw e;
          }
        }}
        title="Clear all rules"
        description={
          <div className="text-xs">
            <p className="mb-2">This will permanently delete all AI rules (prompts) for this document.</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>This action cannot be undone.</li>
              <li>All rules will be deleted immediately (no staging).</li>
            </ul>
          </div>
        }
        confirmButtonText="Delete all rules"
        cancelButtonText="Cancel"
        variant="destructive"
        messages={[
          { variant: 'warning', title: 'Irreversible operation', description: 'All prompts will be permanently removed from this document.' },
        ]}
      />

      {/* Add Prompt Dialog using reusable FormConfirmationDialog */}
      <FormConfirmationDialog
        isOpen={showAddDialog}
        onClose={handleCloseAddDialog}
        title="Create AI Rule"
        description="Fill in the prompt details. The rule will be created and immediately committed."
        confirmButtonText="Create rule"
        cancelButtonText="Cancel"
        variant="default"
        messages={[]}
        initialValues={{ title: '', directive: 'process', prompt: '' }}
        fields={[
          { type: 'text', name: 'title', label: 'Title', placeholder: 'Short descriptive title', required: true },
          {
            type: 'select',
            name: 'directive',
            label: 'Directive',
            placeholder: 'Select directive',
            tooltip: 'Choose what the AI should do with this rule',
            required: true,
            options: [
              { value: 'process', label: 'Process (general processing)' },
              { value: 'identify', label: 'Identify (mark content for review)' },
              { value: 'redact', label: 'Redact (remove or obfuscate sensitive content)' },
              { value: 'preserve', label: 'Preserve (explicitly keep content)' },
              { value: 'exclude', label: 'Exclude (ignore specific content)' },
            ],
          },
          { type: 'textarea', name: 'prompt', label: 'Prompt', placeholder: 'Detailed instructions for the AI', required: true },
        ]}
        onSubmit={handleCreatePromptSubmit}
      />
    </div>
  );
}
