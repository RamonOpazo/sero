import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    document: liveDocument,
    currentPage,
    numPages,
    isViewingProcessedDocument,
    setCurrentPage,
    dispatch,
    setActiveWorkbenchTab,
    setActiveControlsPanel,
  } = useViewportState();

  const { uiSelections, discardAllChanges, selectionCount } = useSelections() as any;

  const aiProc = useAiProcessing();
  const { ensureProjectTrust } = useProjectTrust();

  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);

  // Track redacted load to avoid repeated network requests
  const redactedLoad = useRef<{ inFlight: boolean; loaded: boolean }>({ inFlight: false, loaded: Boolean((liveDocument as any)?.redacted_file) });
  useEffect(() => {
    redactedLoad.current.loaded = Boolean((liveDocument as any)?.redacted_file);
  }, [liveDocument?.redacted_file]);

  // Explicit view switches
  const viewOriginal = useCallback(() => {
    if (!isViewingProcessedDocument) return;
    dispatch({ type: 'SET_VIEWING_PROCESSED', payload: false });
  }, [dispatch, isViewingProcessedDocument]);

  const viewRedacted = useCallback(async () => {
    if (isViewingProcessedDocument) return;
    // If we already have a redacted file pointer, just switch
    if (liveDocument?.redacted_file) {
      dispatch({ type: 'SET_VIEWING_PROCESSED', payload: true });
      redactedLoad.current.loaded = true;
      return;
    }
    // Avoid spamming the server if a previous request is in flight or we already loaded successfully
    if (redactedLoad.current.inFlight || redactedLoad.current.loaded) return;
    redactedLoad.current.inFlight = true;
    try {
      // Try to fetch the redacted file if it exists server-side
      const redacted = await EditorAPI.loadRedactedFile(liveDocument?.id ?? document.id);
      if (!redacted.ok) {
        toast.info('No redacted file available', { description: 'Process the document first to generate it.' });
        return;
      }
      const redFile = redacted.value.file as any;
      const redBlob = redacted.value.blob;
      dispatch({ type: 'SET_VOLATILE_BLOB', payload: { blob: redBlob, forProcessed: true } });
      const baseFiles = Array.isArray((liveDocument as any)?.files) ? [...(liveDocument as any).files] : [];
      const filtered = baseFiles.filter((f: any) => f.file_type !== 'redacted');
      filtered.push({ ...redFile, blob: redBlob });
      const nextDoc: MinimalDocumentType = { ...(liveDocument as any), redacted_file: redFile, files: filtered } as any;
      dispatch({ type: 'SET_DOCUMENT', payload: nextDoc });
      dispatch({ type: 'SET_VIEWING_PROCESSED', payload: true });
      redactedLoad.current.loaded = true;
    } finally {
      redactedLoad.current.inFlight = false;
    }
  }, [dispatch, document, liveDocument, isViewingProcessedDocument]);

  // Toggle after explicit views so we avoid TDZ
  const toggleProcessedView = useCallback(() => {
    if (isViewingProcessedDocument) {
      // Switch to original view
      viewOriginal();
    } else {
      // Switch to redacted view, attempting to load it if necessary
      if (!redactedLoad.current.inFlight) void viewRedacted();
    }
  }, [isViewingProcessedDocument, viewOriginal, viewRedacted]);

  const gotoPrevPage = useCallback(() => {
    setCurrentPage(Math.max(0, currentPage - 1));
  }, [currentPage, setCurrentPage]);

  const gotoNextPage = useCallback(() => {
    setCurrentPage(Math.min(numPages - 1, currentPage + 1));
  }, [currentPage, numPages, setCurrentPage]);

  const openWorkbenchSelections = useCallback(() => {
    setActiveWorkbenchTab('selections');
    setActiveControlsPanel('workbench');
  }, [setActiveWorkbenchTab, setActiveControlsPanel]);

  const openWorkbenchPrompts = useCallback(() => {
    setActiveWorkbenchTab('prompts');
    setActiveControlsPanel('workbench');
  }, [setActiveWorkbenchTab, setActiveControlsPanel]);

  const closeWorkbench = useCallback(() => {
    setActiveControlsPanel('document-controls');
  }, [setActiveControlsPanel]);

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
    viewOriginal,
    viewRedacted,
    gotoPrevPage,
    gotoNextPage,

    // Workbench
    openWorkbenchSelections,
    openWorkbenchPrompts,
    closeWorkbench,

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

