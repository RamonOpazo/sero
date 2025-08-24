import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SelectionsLayer from '../selections-layer';
import { SelectionProvider, useSelections } from '../../../providers/selection-provider';
import { ViewportProvider, useViewportState } from '../../../providers/viewport-provider';
import type { Selection } from '../../../types/viewer';

const sel = (id: string, state: Selection['state']): Selection => ({
  id, x: 0.1, y: 0.1, width: 0.2, height: 0.2, page_number: 0,
  confidence: 1, document_id: 'doc1', created_at: '', updated_at: '', is_ai_generated: false,
  scope: 'document', state, is_global_page: false,
});

function Harness({ initial }: { initial: any }) {
  const { setIsRendered } = useViewportState();
  React.useEffect(() => { setIsRendered(true); }, [setIsRendered]);
  const { selectSelection } = useSelections();
  React.useEffect(() => { selectSelection('d1'); }, [selectSelection]); // select staged_deletion by default
  return <SelectionsLayer documentSize={{ width: 1000, height: 1000 }} />;
}

function Providers({ children, initial }: { children: React.ReactNode; initial: any }) {
  return (
    <ViewportProvider>
      <SelectionProvider documentId="doc1" initialSelections={initial}>
        {children}
      </SelectionProvider>
    </ViewportProvider>
  );
}

describe('SelectionsLayer', () => {
  it('renders red border for staged_deletion and gray for committed', async () => {
    const deletion = sel('d1', 'staged_deletion');
    const committed = sel('c1', 'committed');

    render(
      <Providers initial={{ saved: [deletion, committed] }}>
        <Harness initial={null} />
      </Providers>
    );

    // Two selection boxes present; check classes
    const boxes = document.querySelectorAll('#__selection_layer__ [data-testid="selection-box"]');
    expect(boxes.length).toBeGreaterThanOrEqual(2);

    const hasRed = Array.from(boxes).some(b => b.className.includes('border-red-500/80'));
    const hasGray = Array.from(boxes).some(b => b.className.includes('border-zinc-500/80'));
    expect(hasRed).toBe(true);
    expect(hasGray).toBe(true);
  });

  it('prevents moving staged_deletion selection on drag', async () => {
    const deletion = sel('d1', 'staged_deletion');

    render(
      <Providers initial={{ saved: [deletion] }}>
        <Harness initial={null} />
      </Providers>
    );

    // Query the staged_deletion selection box
    const box = document.querySelector('#__selection_layer__ [data-testid="selection-box"][data-selection-id="d1"]') as HTMLElement;
    expect(box).toBeTruthy();

    // Try to start moving (mouse down and move)
    fireEvent.mouseDown(box, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 200, clientY: 200 });
    fireEvent.mouseUp(document);

    // The selection box position should remain unchanged
    expect(box.style.left).toBe('100px');
    expect(box.style.top).toBe('100px');
  });

  it('prevents resizing staged_deletion selection on drag', async () => {
    const deletion = sel('d1', 'staged_deletion');

    render(
      <Providers initial={{ saved: [deletion] }}>
        <Harness initial={null} />
      </Providers>
    );

    const box = document.querySelector('#__selection_layer__ [data-testid="selection-box"][data-selection-id="d1"]') as HTMLElement;
    expect(box).toBeTruthy();

    // Ensure selection is selected so handles render
    fireEvent.mouseDown(box, { button: 0 });
    fireEvent.mouseUp(box);

    const handle = document.querySelector('#__selection_layer__ [data-testid="resize-se"]') as HTMLElement | null;

    if (handle) {
      fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 400, clientY: 400 });
      fireEvent.mouseUp(document);
    }

    // The selection box size should remain unchanged from initial (0.2 * 1000 = 200)
    expect(box.style.width).toBe('200px');
    expect(box.style.height).toBe('200px');
  });
});
