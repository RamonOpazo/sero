import { useCallback, useMemo } from 'react';
import type { ClassName } from "react-pdf/dist/shared/types.js"
import { type MinimalDocumentType } from "@/types";
import { useViewportState } from '../providers/viewport-provider';
import { useSelections } from '../providers/selections-provider';
import { usePrompts } from '../providers/prompts-provider';
import { cn } from '@/lib/utils';
import { UILifecycleStage } from '../types/lifecycle';

type Props = {
  document: MinimalDocumentType;
  documentSize: { width: number; height: number };
  isVisible: boolean;
  onToggleVisibility: () => void;
};

export default function InfoLayer({ document, documentSize, isVisible }: Props) {
  const { currentPage, numPages, zoom } = useViewportState();
  const { selectionCount, allSelections, getPageSelections, uiSelections, hasUnsavedChanges: selUnsaved } = useSelections() as any;
  const { allPrompts, pendingChanges: promptPending, pendingChangesCount: promptPendingCount } = usePrompts();

  const selLifecycle = useMemo(() => {
    const ui = (uiSelections || []) as any[];
    const unstaged = ui.filter(s => s.dirty === true).length;
    const stagedCreation = ui.filter(s => s.stage === UILifecycleStage.StagedCreation).length;
    const stagedEdition = ui.filter(s => s.stage === UILifecycleStage.StagedEdition).length;
    const stagedDeletion = ui.filter(s => s.stage === UILifecycleStage.StagedDeletion).length;
    const committed = ui.filter(s => s.stage === UILifecycleStage.Committed).length;
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

  return (
    <InfoContainer isVisible={isVisible}>
      <InfoSection name="Document">
        <InfoTitle>{document.name}</InfoTitle>
        <InfoSubtitle>{document.description}</InfoSubtitle>
      </InfoSection>

      <InfoSection name="Core" variant="list">
        <InfoDetail name="Project ID" variant="numeric">{document.project_id}</InfoDetail>
        <InfoDetail name="Document ID" variant="numeric">{document.id}</InfoDetail>
        <InfoDetail name="Created">{formatDate(document.created_at)}</InfoDetail>
        {document.updated_at && (
          <InfoDetail name="Updated">{formatDate(document.updated_at)}</InfoDetail>
        )}
        <InfoDetail name="Status">{document.files?.length > 1 ? "processed" : "pending"}</InfoDetail>
      </InfoSection>

      <InfoSection name="Viewport" variant="list">
        <InfoDetail name="Page">{currentPage + 1} of {numPages}</InfoDetail>
        <InfoDetail name="Zoom">{Math.round(zoom * 100)}%</InfoDetail>
        <InfoDetail name="Size">{Math.round(documentSize.width)} × {Math.round(documentSize.height)}px</InfoDetail>
        <InfoDetail name="Scaled">{Math.round(documentSize.width * zoom)} × {Math.round(documentSize.height * zoom)}px</InfoDetail>
      </InfoSection>

      <InfoSection name="Selections" variant="list">
        <InfoDetail name="Total" variant="numeric">
          [ALL {selectionCount}] [GLOBAL {(allSelections || []).filter((s: any) => s.page_number == null).length}] [ON PAGE {getPageSelections(currentPage).length}]</InfoDetail>
        <InfoDetail name="Saved" variant="numeric">
          [{selUnsaved ? <span className="text-red-600">NO</span> : <span className="text-emerald-600">YES</span>}] [UNSTAGED {selLifecycle.unstaged}] [COMMITTED {selLifecycle.committed} of {selectionCount}]
        </InfoDetail>
        <InfoDetail name="Staged" variant="numeric">
          [CREATE {selLifecycle.stagedCreation}] [UPDATE {selLifecycle.stagedEdition}] [DELETE {selLifecycle.stagedDeletion}]
        </InfoDetail>
      </InfoSection>

      <InfoSection name="AI Prompts" variant="list">
        <InfoDetail name="Total" variant="numeric">{allPrompts.length}</InfoDetail>
          <InfoDetail name="Pending" variant="numeric">
            {promptPendingCount > 0 ? (
              <>c:{promptPending.creates.length}, u:{promptPending.updates.length}, d:{promptPending.deletes.length}</>
            ) : (
              <>{promptPendingCount}</>
            )}
          </InfoDetail>
      </InfoSection>

      <InfoSection name="Original file" variant="list">
        {document.original_file ? (
          <FileDetails file={document.original_file} formatFileSize={formatFileSize} formatDate={formatDate} />
        ) : (
          <InfoEmpty>No original file</InfoEmpty>
        )}
      </InfoSection>

      <InfoSection name="Redacted file" variant="list">
        {document.redacted_file ? (
          <FileDetails file={document.redacted_file} formatFileSize={formatFileSize} formatDate={formatDate} />
        ) : (
          <InfoEmpty>No redacted file</InfoEmpty>
        )}
      </InfoSection>
    </InfoContainer>
  );
}

interface InfoProps {
  children: React.ReactNode
  className?: ClassName
}

function InfoContainer({ children, className, isVisible }: InfoProps & { isVisible: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none",
        "absolute top-0 left-0 bottom-0",
        "flex flex-col gap-2 max-w-full p-4",
        "text-xs transition-all duration-200 ease-out",
        "text-white",
        isVisible
          ? 'opacity-100 translate-x-0 pointer-events-auto'
          : 'opacity-0 -translate-x-2 pointer-events-none',
        className,
      )}
      aria-hidden={!isVisible}
    >{children}</div>
  )
}

function InfoTitle({ children, className }: InfoProps) {
  return (
    <h1 className={cn(
      "text-base sm:text-2xl",
      "bg-black/90 w-fit p-1",
      className,
    )}>{children}</h1>
  )
}

function InfoSubtitle({ children, className }: InfoProps) {
  return (
    <h2 className={cn(
      "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap",
      "bg-black/90 w-fit p-1",
      className,
    )}>{children}</h2>
  )
}

function InfoSection({ children, className, name, variant }: InfoProps & { name: string, variant?: "title" | "list" }) {
  return (
    <section>
      <h3 className={cn(
        "uppercase tracking-wider text-muted-foreground",
        "bg-black/90 w-fit p-1",
        variant === "list" && "text-muted-foreground",
        className,
      )}>{name}</h3>
      <div className={cn(
        variant === "list" && "[&>*]:pl-4",
      )}>{children}
      </div>
    </section>
  )
}

function InfoDetail({ children, className, name, variant }: InfoProps & { name: string, variant?: "text" | "numeric" }) {
  return (
    <div className={cn(
      "bg-black/90 w-fit p-1",
      className,
    )}>
      <span className="text-muted-foreground mr-[1ch]">{name}:</span>
      <span className={cn(variant === "numeric" && "font-mono",)}>{children}</span>
    </div>
  )
}

function InfoEmpty({ children, className }: InfoProps) {
  return (
    <span className={cn(
      "inline-block text-muted-foreground",
      "bg-black/90 w-fit p-1",
      className,
    )}>{children}</span>
  )
}

type FileDetailsProps = {
  file: MinimalDocumentType['original_file'],
  formatFileSize: (n: number) => string,
  formatDate: (s: string) => string,
};

function FileDetails({ file, formatFileSize, formatDate }: FileDetailsProps) {
  if (!file) return null;
  return (
    <>
      <InfoDetail name="ID" variant="numeric">{file.id}</InfoDetail>
      <InfoDetail name="Created">{formatDate(file.created_at)}</InfoDetail>
      {file.updated_at && (<InfoDetail name="Updated">{formatDate(file.updated_at)}</InfoDetail>)}
      <InfoDetail name="MIME">{file.mime_type}</InfoDetail>
      <InfoDetail name="Size" variant="numeric">{formatFileSize(file.file_size)} ({file.file_size} B)</InfoDetail>
    </>
  );
}
