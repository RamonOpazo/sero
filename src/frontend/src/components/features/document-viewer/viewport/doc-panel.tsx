import React from 'react';
import type { MinimalDocumentType } from '@/types';
import { cn } from '@/lib/utils';
import RenderLayer from '../components/viewport/render-layer';
import SelectionsOverlay from './selections-overlay';
import ActionsOverlay from './actions-overlay';

interface DocPanelProps {
  document: MinimalDocumentType;
  documentSize: { width: number; height: number };
  className?: string;
}

/**
 * doc-panel
 *
 * Hosts the PDF render and interaction overlays.
 */
export default function DocPanel({ document, documentSize, className }: DocPanelProps) {
  return (
    <div
      data-slot="doc-panel"
      className={cn('relative', className)}
      style={{ width: documentSize.width, height: documentSize.height }}
    >
      {/* PDF render */}
      <RenderLayer document={document} onDocumentSizeChange={() => { /* parent layout manages size */ }} />

      {/* overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ width: documentSize.width, height: documentSize.height }}
      >
        {/* selections overlay (active interaction) */}
        <SelectionsOverlay documentSize={documentSize} />

        {/* actions overlay (UI controls above selections) */}
        <div className="pointer-events-auto">
          <ActionsOverlay />
        </div>
      </div>
    </div>
  );
}

