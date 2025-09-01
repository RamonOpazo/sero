import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SelectionList from '../selection-list';
import { SelectionsProvider, useSelections } from '../../../providers/selections-provider';
import { ViewportProvider } from '../../../providers/viewport-provider';
import type { Selection } from '../../../types/viewer';

vi.mock('@/components/features/document-viewer/components/dialogs', () => ({
  PageSelectionDialog: (props: any) => props.isOpen ? <div data-testid="page-dialog-open">Page dialog open</div> : null,
}));

vi.mock('@/components/shared/simple-confirmation-dialog', () => ({
  SimpleConfirmationDialog: (props: any) => props.isOpen ? (
    <div>
      <div>Convert to staged edition</div>
      <button onClick={props.onConfirm}>Confirm</button>
    </div>
  ) : null,
}));

const sel = (id: string, state: Selection['state']): Selection => ({
  id, x: 0.1, y: 0.1, width: 0.2, height: 0.2, page_number: 0,
  confidence: 1, document_id: 'doc1', created_at: '', updated_at: '', is_ai_generated: false,
  scope: 'document', state, is_global_page: false,
});

function Providers({ children, initial }: { children: React.ReactNode; initial: any }) {
  return (
    <ViewportProvider>
      <SelectionsProvider documentId="doc1" initialSelections={initial}>
        {children}
      </SelectionsProvider>
    </ViewportProvider>
  );
}

function DoubleClickProbe({ selection }: { selection: Selection }) {
  const { onSelectionDoubleClick } = useSelections();
  return (
    <button data-testid="probe" onClick={() => onSelectionDoubleClick?.(selection)}>probe</button>
  );
}

describe('SelectionList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens conversion dialog on double-click for committed', async () => {
    const s = sel('c1', 'committed');
    render(
      <Providers initial={{ saved: [s] }}>
        <SelectionList />
        <DoubleClickProbe selection={s} />
      </Providers>
    );

    fireEvent.click(screen.getByTestId('probe'));
    expect(screen.getByText('Convert to staged edition')).toBeInTheDocument();
  });

  it('opens conversion dialog on double-click for staged_deletion', async () => {
    const s = sel('d1', 'staged_deletion');
    render(
      <Providers initial={{ saved: [s] }}>
        <SelectionList />
        <DoubleClickProbe selection={s} />
      </Providers>
    );

    fireEvent.click(screen.getByTestId('probe'));
    expect(screen.getByText('Convert to staged edition')).toBeInTheDocument();
  });

  it('does not open PageSelectionDialog when clicking page/global for committed or staged_deletion', async () => {
    const committed = sel('c2', 'committed');
    const deletion = sel('d2', 'staged_deletion');
    const editable = sel('e2', 'staged_edition');

    render(
      <Providers initial={{ saved: [committed, deletion, editable] }}>
        <SelectionList />
      </Providers>
    );

    const committedToggle = screen.getByTestId('selection-toggle-c2');
    fireEvent.click(committedToggle);
    expect(screen.queryByTestId('page-dialog-open')).not.toBeInTheDocument();

    const deletionToggle = screen.getByTestId('selection-toggle-d2');
    fireEvent.click(deletionToggle);
    expect(screen.queryByTestId('page-dialog-open')).not.toBeInTheDocument();

    const editableToggle = screen.getByTestId('selection-toggle-e2');
    fireEvent.click(editableToggle);
    expect(await screen.findByTestId('page-dialog-open')).toBeInTheDocument();
  });

  it('shows Deletion status label for staged_deletion', async () => {
    const deletion = sel('d3', 'staged_deletion');
    render(
      <Providers initial={{ saved: [deletion] }}>
        <SelectionList />
      </Providers>
    );
    expect(screen.getByText('Deletion')).toBeInTheDocument();
  });
});
