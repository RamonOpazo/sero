import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InfoLayer from '../info-layer';
import { ViewportProvider } from '../../../providers/viewport-provider';
import { SelectionsProvider } from '../../../providers/selections-provider';
import type { Selection } from '../../../types/viewer';
import type { MinimalDocumentType } from '@/types';

vi.mock('../../../providers/prompt-provider', () => ({
  usePrompts: () => ({
    state: {},
    allPrompts: [],
    pendingChanges: { creates: [], updates: [], deletes: [] },
    pendingChangesCount: 0,
  }),
}));

const sel = (id: string, state: Selection['state'], overrides: Partial<Selection> = {}): Selection => ({
  id,
  x: 0.1,
  y: 0.1,
  width: 0.2,
  height: 0.2,
  page_number: 0,
  confidence: 1,
  document_id: 'doc1',
  created_at: '',
  updated_at: '',
  is_ai_generated: false,
  scope: 'document',
  state,
  is_global_page: false,
  ...overrides,
});

const doc = (overrides: Partial<MinimalDocumentType> = {}): MinimalDocumentType => ({
  id: 'doc1',
  project_id: 'p1',
  name: 'Test Doc',
  description: '',
  created_at: new Date().toISOString(),
  updated_at: null,
  files: [],
  original_file: { id: 'f1', created_at: new Date().toISOString(), updated_at: null, file_size: 100, mime_type: 'application/pdf', file_type: 'original' } as any,
  redacted_file: null as any,
  ...overrides,
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

describe('InfoLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes global count from allSelections (page_number == null)', () => {
    const globalSel = sel('g1', 'committed', { page_number: null as any });
    const page0 = sel('p0', 'committed', { page_number: 0 });
    const page1 = sel('p1', 'committed', { page_number: 1 as any });

    const { getByText } = render(
      <Providers initial={{ saved: [globalSel, page0, page1] }}>
        <InfoLayer
          document={doc()}
          documentSize={{ width: 1000, height: 1000 }}
          isVisible={true}
          onToggleVisibility={() => {}}
        />
      </Providers>
    );

    const globalRow = getByText(/Global:/).parentElement as HTMLElement;
    expect(globalRow.textContent || '').toMatch(/Global:\s*1/);
  });

  it('shows lifecycle counts for staged and unstaged correctly', () => {
    const stagedCreation = sel('c1', 'staged_creation');
    const stagedEdition = sel('u1', 'staged_edition');
    const stagedDeletion = sel('d1', 'staged_deletion');
    const committed = sel('m1', 'committed');
    // Draft (unstaged)
    const draft = sel('n1', 'committed');

    const { getByText } = render(
      <Providers initial={{ saved: [stagedCreation, stagedEdition, stagedDeletion, committed], new: [draft] }}>
        <InfoLayer
          document={doc()}
          documentSize={{ width: 1000, height: 1000 }}
          isVisible={true}
          onToggleVisibility={() => {}}
        />
      </Providers>
    );

    // Unstaged: 1 (the draft)
    const unstagedRow = getByText(/Unstaged:/).parentElement as HTMLElement;
    expect(unstagedRow.textContent || '').toMatch(/Unstaged:\s*1/);
    // Staged counts
    const stagedRow = getByText(/Staged:/).parentElement as HTMLElement;
    const stagedText = stagedRow.textContent || '';
    expect(stagedText).toContain('c:1');
    expect(stagedText).toContain('u:1');
    expect(stagedText).toContain('d:1');
    // Committed
    const committedRow = getByText(/Committed:/).parentElement as HTMLElement;
    expect(committedRow.textContent || '').toMatch(/Committed:\s*1/);
  });
});
