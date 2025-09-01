import { useCallback, useMemo, useState } from "react";
import type { MinimalDocumentType } from "@/types";
import { toast } from "sonner";
import { useViewportState } from "../providers/viewport-provider";
import { useSelections } from "../providers/selections-provider";
import { useAiProcessing } from "@/providers/ai-processing-provider";
import { useProjectTrust } from "@/providers/project-trust-provider";
import { DocumentViewerAPI } from "@/lib/document-viewer-api";
import { DocumentsAPI } from "@/lib/documents-api";
import { EditorAPI } from "@/lib/editor-api";

export function useDocumentActions(document: MinimalDocumentType) {
  const {
    currentPage,
    numPages,
    isViewingProcessedDocument,
    setCurrentPage,
    dispatch,
    setActiveControlsPanel,
    setActiveWorkbenchTab,
  } = useViewportState();

  const { uiSelections, discardAllChanges, selectionCount } = useSelections() as any;

  const aiProc = useAiProcessing();
  const { ensureProjectTrust } = useProjectTrust();

  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  const toggleProcessedView = useCallback(() => {
    dispatch({ type: 'SET_VIEWING_PROCESSED', payload: !isViewingProcessedDocument });
  }, [dispatch, isViewingProcessedDocument]);

  const gotoPrevPage = useCallback(() => {
    setCurrentPage(Math.max(0, currentPage - 1));
  }, [currentPage, setCurrentPage]);

  const gotoNextPage = useCallback(() => {
    setCurrentPage(Math.min(numPages - 1, currentPage + 1));
  }, [currentPage, numPages, setCurrentPage]);

  const openWorkbenchSelections = useCallback(() => {
    setActiveControlsPanel('workbench');
    setActiveWorkbenchTab('selections');
  }, [setActiveControlsPanel, setActiveWorkbenchTab]);

  const openWorkbenchPrompts = useCallback(() => {
    setActiveControlsPanel('workbench');
    setActiveWorkbenchTab('prompts');
  }, [setActiveControlsPanel, setActiveWorkbenchTab]);

  const discardAllUnsaved = useCallback(() => {
    const totalUnsaved = (uiSelections || []).filter((s: any) => s.dirty === true).length;
    if (totalUnsaved === 0) { toast.info('No unsaved changes to discard'); return; }
    discardAllChanges();
    toast.success(`Discarded ${totalUnsaved} unsaved change${totalUnsaved === 1 ? '' : 's'}`);
  }, [uiSelections, discardAllChanges]);

  const runAi = useCallback(async () => {
    try {
      setIsApplyingAI(true);
      const { keyId, encryptedPassword } = await ensureProjectTrust(document.project_id);
      const ctrl = DocumentViewerAPI.applyAiStream(document.id, {
        onStatus: (d: any) => { aiProc.updateJob({ id: document.id, stage: d.stage, stageIndex: d.stage_index ?? 0, stageTotal: d.stage_total ?? (aiProc.state.jobs[document.id]?.stageTotal ?? 1), percent: d.percent ?? (aiProc.state.jobs[document.id]?.percent ?? 0), hints: d.subtask ? [d.subtask] : [] }); },
        onModel: (m: any) => { aiProc.updateJob({ id: document.id, hints: [`model: ${m.name}`] }); },
        onTokens: () => { aiProc.updateJob({ id: document.id, stage: 'generating' }); },
        onStagingProgress: (sp: any) => { aiProc.updateJob({ id: document.id, percent: typeof sp.percent === 'number' ? sp.percent : undefined as any }); },
        onSummary: async (s: any) => { aiProc.updateJob({ id: document.id, hints: [`staged: ${s.staged}`] }); await (useSelections() as any).state.reload?.(); },
        onCompleted: () => { setIsApplyingAI(false); aiProc.completeJob(document.id); aiProc.clearJob(document.id); toast.success('AI completed'); },
        onError: (e: any) => { setIsApplyingAI(false); aiProc.failJob(document.id, { message: e.message ?? 'unknown' }); aiProc.clearJob(document.id); toast.error(`AI error: ${e.message ?? 'unknown'}`); },
        keyId,
        encryptedPassword,
      } as any);
      aiProc.registerCancel(document.id, ctrl.cancel);
    } catch (e) {
      setIsApplyingAI(false);
    }
  }, [aiProc, document.id, document.project_id, ensureProjectTrust]);

  const processDocument = useCallback(async () => {
    try {
      setIsProcessingDoc(true);
      // Require at least one selection
      if (selectionCount === 0) {
        toast.info('Add a selection first', { description: 'Create at least one redaction area to enable processing.' });
        setIsProcessingDoc(false);
        return;
      }
      const { keyId, encryptedPassword } = await ensureProjectTrust(document.project_id);
      const result = await DocumentsAPI.processDocumentEncrypted(document.id, { keyId, encryptedPassword });
      if (!result.ok) { setIsProcessingDoc(false); return; }
      const redacted = await EditorAPI.loadRedactedFile(document.id);
      if (!redacted.ok) {
        setIsProcessingDoc(false);
        toast.warning('Processed, but failed to fetch redacted file', { description: 'Try toggling to Redacted view or downloading again.' });
        dispatch({ type: 'SET_VIEWING_PROCESSED', payload: true });
        return;
      }
      const redFile = redacted.value.file as any;
      const redBlob = redacted.value.blob;
      dispatch({ type: 'SET_VOLATILE_BLOB', payload: { blob: redBlob, forProcessed: true } });
      const nextFiles = Array.isArray((document as any).files) ? [...(document as any).files] : [];
      const filtered = nextFiles.filter((f: any) => f.file_type !== 'redacted');
      filtered.push({ ...redFile, blob: redBlob });
      const nextDoc: MinimalDocumentType = { ...(document as any), redacted_file: redFile, files: filtered } as any;
      dispatch({ type: 'SET_DOCUMENT', payload: nextDoc });
      dispatch({ type: 'SET_VIEWING_PROCESSED', payload: true });
      setIsProcessingDoc(false);
      toast.success('Document processed successfully');
    } catch (err: any) {
      setIsProcessingDoc(false);
      if (err instanceof Error && err.message === 'cancelled') { toast.message('Project unlock cancelled'); return; }
      toast.error('Processing failed');
    }
  }, [dispatch, document, ensureProjectTrust, selectionCount]);

  const isDownloadAvailable = useMemo(() => {
    return Boolean(document.original_file || document.redacted_file);
  }, [document.original_file, document.redacted_file]);

  const downloadCurrentView = useCallback(() => {
    const currentFile = isViewingProcessedDocument ? document.redacted_file : document.original_file;
    if (currentFile && document.files) {
      const fileWithBlob = (document.files as any[]).find((f: any) => f.id === (currentFile as any).id);
      if (fileWithBlob && 'blob' in fileWithBlob && fileWithBlob.blob instanceof Blob) {
        const url = URL.createObjectURL(fileWithBlob.blob);
        const link = globalThis.document.createElement('a');
        link.href = url;
        const fname = isViewingProcessedDocument ? `${document.id}.pdf` : `${document.name}_original.pdf`;
        link.download = fname;
        link.click();
        URL.revokeObjectURL(url);
      }
    }
  }, [document.files, document.id, document.name, document.original_file, document.redacted_file, isViewingProcessedDocument]);

  return {
    // View
    toggleProcessedView,
    gotoPrevPage,
    gotoNextPage,

    // Workbench
    openWorkbenchSelections,
    openWorkbenchPrompts,

    // Selections
    discardAllUnsaved,

    // Rules
    runAi,
    isApplyingAI,

    // Document
    processDocument,
    isProcessingDoc,
    downloadCurrentView,
    isDownloadAvailable,
  } as const;
}

