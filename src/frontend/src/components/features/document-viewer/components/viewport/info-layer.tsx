import { useCallback, useMemo } from 'react';
import { type MinimalDocumentType } from "@/types";
import { useViewportState } from '../../providers/viewport-provider';
import { useSelections } from '../../providers/selection-provider';
import { usePrompts } from '../../providers/prompt-provider';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UISelectionStage } from '../../types/selection-lifecycle';

type Props = {
  document: MinimalDocumentType;
  documentSize: { width: number; height: number };
  isVisible: boolean;
  onToggleVisibility: () => void;
};


type FileDetailsProps = {
  file: MinimalDocumentType['original_file'],
  formatFileSize: (n: number) => string,
  formatDate: (s: string) => string,
};

function FileDetails({ file, formatFileSize, formatDate }: FileDetailsProps) {
  if (!file) return null;
  return (
    <div className="ml-4 space-y-1">
      <div><span className="text-muted-foreground">ID:</span> <span className="font-mono break-all">{file.id}</span></div>
      <div><span className="text-muted-foreground">Created:</span> <span>{formatDate(file.created_at)}</span></div>
      {file.updated_at && (<div><span className="text-muted-foreground">Updated:</span> <span>{formatDate(file.updated_at)}</span></div>)}
      <div><span className="text-muted-foreground">MIME:</span> <span>{file.mime_type}</span></div>
      <div><span className="text-muted-foreground">Size:</span> <span>{formatFileSize(file.file_size)} ({file.file_size} B)</span></div>
    </div>
  );
}

export default function InfoLayer({ document, documentSize, isVisible, onToggleVisibility }: Props) {
  const { currentPage, numPages, zoom } = useViewportState();
  const { selectionCount, getGlobalSelections, getPageSelections, uiSelections, hasUnsavedChanges: selUnsaved } = useSelections() as any;
  const { allPrompts, pendingChanges: promptPending, pendingChangesCount: promptPendingCount } = usePrompts();

  const selLifecycle = useMemo(() => {
    const ui = (uiSelections || []) as any[];
    const unstaged = ui.filter(s => s.dirty === true).length;
    const stagedCreation = ui.filter(s => s.stage === UISelectionStage.StagedCreation).length;
    const stagedEdition = ui.filter(s => s.stage === UISelectionStage.StagedEdition).length;
    const stagedDeletion = ui.filter(s => s.stage === UISelectionStage.StagedDeletion).length;
    const committed = ui.filter(s => s.stage === UISelectionStage.Committed).length;
    return { unstaged, stagedCreation, stagedEdition, stagedDeletion, committed };
  }, [uiSelections]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Simple appear/disappear transition via CSS classes
  // Keep the layer mounted to allow exit transitions; disable interactions when hidden
  const visibilityClasses = isVisible
    ? 'opacity-100 translate-x-0 pointer-events-auto'
    : 'opacity-0 -translate-x-2 pointer-events-none';

  return (
    <div
      className={cn(
        "absolute top-0 left-0 bottom-0 z-[2100]",
        "flex flex-col gap-4 w-[60ch] max-w-[60ch] p-4",
        "rounded-l-md bg-black/90 backdrop-blur-xs backdrop-saturate-0",
        "text-xs transition-all duration-200 ease-out",
        `${visibilityClasses}`
      )}
      onClick={onToggleVisibility}
      aria-hidden={!isVisible}
    >
      {/* Full-area content container */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleVisibility}
        className="absolute top-4 right-4"
        aria-label="Close info"
      >
        <X />
      </Button>
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Info</h1>
      </div>
      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground">Document</h2>
        <h1 className="text-base sm:text-lg">{document.name}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{document.description}</p>
      </div>

      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">Core</h2>
        <div className="ml-4 space-y-1">
          <div><span className="text-muted-foreground">Project ID:</span> <span className="font-mono break-all">{document.project_id}</span></div>
          <div><span className="text-muted-foreground">Document ID:</span> <span className="font-mono break-all">{document.id}</span></div>
          <div><span className="text-muted-foreground">Created:</span> <span>{formatDate(document.created_at)}</span></div>
          {document.updated_at && (
            <div><span className="text-muted-foreground">Updated:</span> <span>{formatDate(document.updated_at)}</span></div>
          )}
          <div><span className="text-muted-foreground">Status:</span> <span>{document.files?.length > 1 ? "processed" : "pending"}</span></div>
        </div>
      </div>

      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">Viewport</h2>
        <div className="ml-4 space-y-1">
          <div><span className="text-muted-foreground">Page:</span> <span className="font-medium">{currentPage + 1} of {numPages}</span></div>
          <div><span className="text-muted-foreground">Zoom:</span> <span>{Math.round(zoom * 100)}%</span></div>
          <div><span className="text-muted-foreground">Size:</span> <span>{Math.round(documentSize.width)} × {Math.round(documentSize.height)}px</span></div>
          <div><span className="text-muted-foreground">Scaled:</span> <span>{Math.round(documentSize.width * zoom)} × {Math.round(documentSize.height * zoom)}px</span></div>
        </div>
      </div>

      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">Selections</h2>
        <div className="ml-4 space-y-1">
          <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{selectionCount}</span></div>
          <div><span className="text-muted-foreground">Global:</span> <span>{getGlobalSelections().length}</span></div>
          <div><span className="text-muted-foreground">On page:</span> <span>{getPageSelections(currentPage).length}</span></div>
          <div><span className="text-muted-foreground">Unstaged:</span> <span className="font-medium">{selLifecycle.unstaged}</span></div>
          <div><span className="text-muted-foreground">Staged:</span> <span>c:{selLifecycle.stagedCreation}, u:{selLifecycle.stagedEdition}, d:{selLifecycle.stagedDeletion}</span></div>
          <div><span className="text-muted-foreground">Committed:</span> <span>{selLifecycle.committed}</span></div>
          <div><span className="text-muted-foreground">Unsaved:</span> <span>{selUnsaved ? 'yes' : 'no'}</span></div>
        </div>
      </div>

      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">AI Prompts</h2>
        <div className="ml-4 space-y-1">
          <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{allPrompts.length}</span></div>
          <div>
            <span className="text-muted-foreground">Pending:</span>{' '}
            <span>{promptPendingCount}</span>
            {promptPendingCount > 0 && (
              <span className="text-muted-foreground"> (c:{promptPending.creates.length}, u:{promptPending.updates.length}, d:{promptPending.deletes.length})</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">Original file</h2>
        {document.original_file ? (
          <FileDetails file={document.original_file} formatFileSize={formatFileSize} formatDate={formatDate} />
        ) : (
          <div className="text-muted-foreground ml-4">No original file</div>
        )}
      </div>

      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground mb-2">Redacted file</h2>
        {document.redacted_file ? (
          <FileDetails file={document.redacted_file} formatFileSize={formatFileSize} formatDate={formatDate} />
        ) : (
          <div className="text-muted-foreground ml-4">No redacted file</div>
        )}
      </div>
    </div>
  );
}
