import React from 'react';
import { cn } from '@/lib/utils';
import { useViewportState } from '../components/providers/viewport-provider';

interface BgLayerProps {
  documentSize: { width: number; height: number };
  className?: string;
}

/**
 * bg-layer
 *
 * Background reference layer sized to the current document render size.
 * Matches the legacy dotted background and border. Lives inside the
 * transform container so it pans with content. Background spacing scales
 * with zoom to preserve the previous visual behavior.
 */
export default function BgLayer({ documentSize, className }: BgLayerProps) {
  const { zoom } = useViewportState();

  return (
    <div
      data-slot="bg-layer"
      className={cn('absolute rounded-md border pointer-events-none', className)}
      style={{
        width: documentSize.width,
        height: documentSize.height,
        background:
          'radial-gradient(circle at 2px 2px, color-mix(in srgb, var(--ring) 25%, transparent) 2px, transparent 0px)',
        backgroundSize: `${25 * zoom}px ${25 * zoom}px`,
        // backgroundPosition intentionally omitted because pan is applied by the parent transform
      }}
    />
  );
}

