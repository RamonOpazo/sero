import React from 'react';
import { cn } from '@/lib/utils';
import type { MinimalDocumentType } from '@/types';
import { useViewportState } from '../components/providers/viewport-provider';
import InfoPanel from './info-panel';
import DocPanel from './doc-panel';

interface FgLayerProps {
  document: MinimalDocumentType;
  documentSize: { width: number; height: number };
  className?: string;
}

/**
 * fg-layer
 *
 * Shared container that splits into two panels:
 * - info-panel (left): consolidated information and controls
 * - doc-panel (right): document rendering surface with overlays
 */
export default function FgLayer({ document, documentSize, className }: FgLayerProps) {
  const { showInfoPanel } = useViewportState();

  return (
    <div
      data-slot="fg-layer"
      className={cn('absolute inset-auto flex items-start gap-4', className)}
      // Positioned by parent transform, width/height driven by children
    >
      {/* Info panel (left) */}
      {showInfoPanel && (
        <div className="shrink-0 w-[60ch] max-w-[60ch]">
          <InfoPanel document={document} />
        </div>
      )}

      {/* Doc panel (right) */}
      <div className="relative">
        <DocPanel document={document} documentSize={documentSize} />
      </div>
    </div>
  );
}

