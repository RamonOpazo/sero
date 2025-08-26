import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Hourglass, AlertCircle, Bot } from "lucide-react";
import { AiProgress } from "./ai-progress";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { MinimalDocumentType } from "@/types";
import { FormConfirmationDialog } from "@/components/shared";
import PromptsList from "./prompt-list";
import { usePrompts } from "../../providers/prompt-provider";
import { useSelections } from "../../providers/selection-provider";
import { DocumentViewerAPI } from '@/lib/document-viewer-api';
import { encryptPasswordSecurely, isWebCryptoSupported } from '@/lib/crypto';
import { DocumentPasswordDialog } from '@/views/editor-view/dialogs';

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
    updatePrompt,
    clearAll,
    allPrompts,
    hasUnsavedChanges,
    pendingChangesCount,
  } = usePrompts();
  
  const { state: selectionStateDV } = useSelections() as any;
  
  const isSaving = (state as any).isSaving || false;
  const isLoading = (state as any).isLoading || false;
  const isDeleting = (state as any).isDeleting || false;
  const error = (state as any).error || null;
  const isAnyOperationInProgress = !!(isSaving || isLoading || isDeleting);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const [aiStage, setAiStage] = useState<string | null>(null);
  const [aiTokenChars, setAiTokenChars] = useState<number>(0);
  const [aiSummary, setAiSummary] = useState<{ returned: number; filtered_out: number; staged: number; min_confidence: number } | null>(null);
  const [aiStageIndex, setAiStageIndex] = useState<number | null>(null);
  const [aiStageTotal, setAiStageTotal] = useState<number | null>(null);
  const [aiStagePercent, setAiStagePercent] = useState<number | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Password dialog state for AI
  const [isAIPasswordOpen, setAIPasswordOpen] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [aiPasswordError, setAIPasswordError] = useState<string | null>(null);
  
  // Load prompts when component mounts
  useEffect(() => {
    load();
  }, [load]);

  // Calculate prompt statistics
  const promptStats = useMemo(() => {
    const totalCount = allPrompts.length;
    const savedCount = (state as any).persistedItems?.length || 0;
    const newCount = (state as any).draftItems?.length || 0;
    return {
      totalCount,
      savedCount,
      newCount,
      hasUnsavedChanges,
      totalUnsavedChanges: pendingChangesCount,
    };
  }, [allPrompts.length, (state as any).persistedItems?.length, (state as any).draftItems?.length, hasUnsavedChanges, pendingChangesCount]);

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

  // Open password dialog for AI
  const handleOpenAIDialog = useCallback(() => {
    setAIPasswordOpen(true);
    setAIPasswordError(null);
  }, []);

  // Runner using credentials
  const handleRunAIDetectionWithCredentials = useCallback(async (keyId?: string, encryptedPassword?: string) => {
    try {
      setIsApplyingAI(true);
      setAiStage('start');
      setAiTokenChars(0);
      setAiSummary(null);
      const ctrl = DocumentViewerAPI.applyAiStream(document.id, {
        onStatus: (d: any) => {
          setAiStage(d.stage);
          if (typeof d.stage_index === 'number') setAiStageIndex(d.stage_index);
          if (typeof d.stage_total === 'number') setAiStageTotal(d.stage_total);
          if (typeof d.percent === 'number') setAiStagePercent(d.percent);
        },
        onModel: (m: any) => setAiStage((prev) => prev ?? `model:${m.name}`),
        onTokens: (t: any) => setAiTokenChars(t.chars),
        onStagingProgress: (sp: any) => {
          if (typeof sp.percent === 'number') setAiStagePercent(sp.percent);
        },
        onSummary: async (s: any) => {
          setAiSummary(s);
          if (typeof (selectionStateDV as any).reload === 'function') {
            await (selectionStateDV as any).reload();
          }
        },
        onCompleted: () => {
          setIsApplyingAI(false);
          setAiStage(null);
          setAiStagePercent(null);
          setAiStageIndex(null);
          setAiStageTotal(null);
          const s = aiSummary;
          if (s) {
            const count = s.staged;
            const plural = count === 1 ? '' : 's';
            toast.success(`AI generated ${count} selection${plural} (staged) – filtered ${s.filtered_out} of ${s.returned}`);
          } else {
            toast.success('AI completed');
          }
        },
        onError: (e: any) => {
          setIsApplyingAI(false);
          setAiStage(null);
          toast.error(`AI error: ${e.message ?? 'unknown'}`);
        },
        ...(keyId && encryptedPassword ? { keyId, encryptedPassword } : {}),
      } as any);
      cancelRef.current = ctrl.cancel;
    } catch (err) {
      setIsApplyingAI(false);
      setAiStage(null);
      toast.error('Failed to run AI detection');
    }
  }, [document.id, selectionStateDV, aiSummary]);

  // Handle password confirm: encrypt and start streaming
  const handleAIPasswordConfirm = useCallback(async (password: string) => {
    try {
      if (!isWebCryptoSupported()) {
        setAIPasswordError('Web Crypto API is not supported in this browser');
        return;
      }
      setIsEncrypting(true);
      const encrypted = await encryptPasswordSecurely(password);
      setIsEncrypting(false);
      setAIPasswordOpen(false);
      await handleRunAIDetectionWithCredentials(encrypted.keyId, encrypted.encryptedPassword);
    } catch (e) {
      setIsEncrypting(false);
      setAIPasswordError('Failed to encrypt password');
    }
  }, [handleRunAIDetectionWithCredentials]);

  const stageLabel = aiStage;

  const handleCancelAI = useCallback(() => {
    try {
      if (cancelRef.current) {
        cancelRef.current();
      }
      cancelRef.current = null;
    } finally {
      setIsApplyingAI(false);
      setAiStage(null);
      toast.info('AI run canceled');
    }
  }, []);

  // Clear all prompts
  const handleClearAll = useCallback(() => {
    if (promptStats.totalCount === 0) {
      toast.info('No prompts to clear');
      return;
    }
    
    clearAll();
    toast.success(`Cleared all ${promptStats.totalCount} prompts`);
  }, [clearAll, promptStats.totalCount]);

  // Handle add prompt button
  const handleOpenAddDialog = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  // Handle edit prompt
  const handleEditPrompt = useCallback((promptId: string) => {
    setEditingPromptId(promptId);
    setShowEditDialog(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setShowEditDialog(false);
    setEditingPromptId(null);
  }, []);

  // Declarative edit handler
  const handleEditPromptSubmit = useCallback(async (values: Record<string, any>) => {
    if (!editingPromptId) throw new Error('no-id');
    const title = String(values.title ?? '').trim();
    const directive = String(values.directive ?? '').trim();
    const promptBody = String(values.prompt ?? '').trim();
    if (!title || !promptBody || !directive) {
      toast.error('Please fill in title, directive, and prompt');
      throw new Error('validation');
    }

    updatePrompt(editingPromptId, {
      title,
      prompt: promptBody,
      directive,
      state: 'committed',
      scope: 'document',
    } as any);
    const res = await save();
    if (!res.ok) {
      toast.error('Failed to update prompt');
      throw new Error('api');
    }
    toast.success('Rule updated and committed');
    setShowEditDialog(false);
    setEditingPromptId(null);
  }, [editingPromptId, updatePrompt, save]);

  if (error) {
    return (
      <div className="text-xs text-destructive p-3 border border-destructive/20 bg-destructive/5 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt Statistics */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Prompts</span>
          <span className="text-xs font-mono">{promptStats.totalCount}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Saved Prompts</span>
          <span className="text-xs font-mono">{promptStats.savedCount}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">New Prompts</span>
          <span className="text-xs font-mono">{promptStats.newCount}</span>
        </div>
        
        {promptStats.hasUnsavedChanges && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Unsaved Changes</span>
              <AlertCircle className="h-3 w-3 text-amber-500" />
            </div>
            <span className="text-xs font-mono">{promptStats.totalUnsavedChanges}</span>
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* Action Controls */}
      <div className="flex flex-col gap-2">
        {isApplyingAI && (
          <div className="flex flex-col gap-2">
            <AiProgress
              currentStageLabel={stageLabel}
              stageIndex={aiStageIndex}
              stageTotal={aiStageTotal}
              stagePercent={aiStagePercent}
              onCancel={handleCancelAI}
            />
            {aiTokenChars > 0 && (
              <div className="text-[11px] text-muted-foreground flex items-center justify-end">
                <span className="font-mono">{aiTokenChars} chars</span>
              </div>
            )}
          </div>
        )}
        <Button
          variant="default"
          size="sm"
        onClick={handleOpenAIDialog}
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
          disabled={promptStats.totalCount === 0}
          className="w-full justify-start h-9 text-xs"
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Clear all rules
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-2 w-full min-w-0">
        <PromptsList documentId={document.id} onEditPrompt={handleEditPrompt} />
      </div>
      
      {/* AI Password Dialog */}
      <DocumentPasswordDialog
        isOpen={isAIPasswordOpen}
        onClose={() => { setAIPasswordOpen(false); setAIPasswordError(null); }}
        onConfirm={handleAIPasswordConfirm}
        error={aiPasswordError}
        isLoading={isEncrypting}
        notice="Password is used locally to encrypt before sending."
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
      
      {/* Edit Rule Dialog using FormConfirmationDialog */}
      {editingPromptId ? (
        <FormConfirmationDialog
          isOpen={showEditDialog}
          onClose={handleCloseEditDialog}
          title="Edit AI Rule"
          description="Modify the rule. Changes will be saved and committed."
          confirmButtonText="Save changes"
          cancelButtonText="Cancel"
          variant="default"
          messages={[]}
          initialValues={() => {
            const editing = allPrompts.find(p => p.id === editingPromptId) as any;
            return editing ? { title: editing.title ?? '', directive: editing.directive ?? 'process', prompt: editing.prompt ?? '' } : { title: '', directive: 'process', prompt: '' };
          }}
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
          onSubmit={handleEditPromptSubmit}
        />
      ) : null}
      
      {/* Save Confirmation Dialog (inline) */}
    </div>
  );
}
