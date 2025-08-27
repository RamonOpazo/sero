import React from 'react';
import { cn } from '@/lib/utils';
import type { MinimalDocumentType } from '@/types';
import { useViewportState } from '../components/providers/viewport-provider';

interface InfoPanelProps {
  document: MinimalDocumentType;
  className?: string;
}

/**
 * info-panel
 *
 * Consolidated information panel. Initial scaffold shows basic document
 * and viewport context. Later we will fold selections and prompts panels
 * into unified sections/tabs here.
 */
export default function InfoPanel({ document, className }: InfoPanelProps) {
  const { currentPage, numPages, zoom } = useViewportState();

  return (
    <aside
      data-slot="info-panel"
      className={cn(
        'rounded-md border bg-background/90 backdrop-blur-xs backdrop-saturate-0',
        'p-4 text-xs w-full',
        className,
      )}
    >
      <div>
        <h2 className="uppercase tracking-wider text-muted-foreground">Document</h2>
        <h1 className="text-base">{document.name}</h1>
        {document.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {document.description}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="col-span-2 uppercase tracking-wider text-muted-foreground">Viewport</div>
        <div className="flex items-center justify-between px-2 py-1 rounded border bg-muted/30">
          <span className="text-muted-foreground">Page</span>
          <span className="font-mono">{currentPage + 1} / {numPages}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 rounded border bg-muted/30">
          <span className="text-muted-foreground">Zoom</span>
          <span className="font-mono">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* TODO: Fold in selections and prompts sections here */}
    </aside>
  );
}

