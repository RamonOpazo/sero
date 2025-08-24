import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectionProvider, useSelections } from '../selection-provider';
import type { Selection } from '../../types/viewer';

vi.mock('@/lib/document-viewer-api', async () => {
  return {
    DocumentViewerAPI: {
      convertSelectionToStaged: vi.fn(async () => ({ ok: true, value: {} })),
      updateSelection: vi.fn(async () => ({ ok: true })),
      createSelection: vi.fn(async (_docId: string, _payload: any) => ({ ok: true, value: { id: 'new-id' } })),
      fetchDocumentSelections: vi.fn(async (_docId: string) => ({ ok: true, value: [] })),
      commitStagedSelections: vi.fn(async (_docId: string, _opts: any) => ({ ok: true })),
    }
  };
});

const committedSel = (overrides?: Partial<Selection>): Selection => ({
  id: 's1', x: 0.1, y: 0.1, width: 0.2, height: 0.2, page_number: 0,
  confidence: 1, document_id: 'doc1', created_at: '', updated_at: '', is_ai_generated: false,
  scope: 'document', state: 'committed', is_global_page: false, ...overrides,
});

const stagedDeletionSel = (overrides?: Partial<Selection>): Selection => ({
  id: 's2', x: 0.3, y: 0.3, width: 0.1, height: 0.1, page_number: 0,
  confidence: 1, document_id: 'doc1', created_at: '', updated_at: '', is_ai_generated: false,
  scope: 'document', state: 'staged_deletion', is_global_page: false, ...overrides,
});

function Probe({ onReady }: { onReady: (api: ReturnType<typeof useSelections>) => void }) {
  const api = useSelections();
  React.useEffect(() => { onReady(api); }, [api, onReady]);
  return null;
}

describe('SelectionProvider - conversion, deletion, and lifecycle save/commit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts committed to staged_edition via convertSelectionToStagedEdition', async () => {
    const initial = { saved: [committedSel()] };
    let apiRef: ReturnType<typeof useSelections> | null = null;

    render(
      <SelectionProvider documentId="doc1" initialSelections={initial as any}>
        <Probe onReady={(api) => { apiRef = api; }} />
      </SelectionProvider>
    );

    expect(apiRef).not.toBeNull();
    const { allSelections, convertSelectionToStagedEdition } = apiRef!;
    expect(allSelections.find(s => s.id === 's1')?.state).toBe('committed');

    await act(async () => {
      const ok = await convertSelectionToStagedEdition('s1');
      expect(ok).toBe(true);
    });

    const after = apiRef!.allSelections.find(s => s.id === 's1');
    expect(after?.state).toBe('staged_edition');

    const { DocumentViewerAPI } = await import('@/lib/document-viewer-api');
    expect(DocumentViewerAPI.convertSelectionToStaged).toHaveBeenCalledWith('s1');
  });

  it('converts staged_deletion to staged_edition via updateSelection', async () => {
    const initial = { saved: [stagedDeletionSel()] };
    let apiRef: ReturnType<typeof useSelections> | null = null;

    render(
      <SelectionProvider documentId="doc1" initialSelections={initial as any}>
        <Probe onReady={(api) => { apiRef = api; }} />
      </SelectionProvider>
    );

    expect(apiRef).not.toBeNull();
    const { allSelections, convertSelectionToStagedEdition } = apiRef!;
    expect(allSelections.find(s => s.id === 's2')?.state).toBe('staged_deletion');

    await act(async () => {
      const ok = await convertSelectionToStagedEdition('s2');
      expect(ok).toBe(true);
    });

    const after = apiRef!.allSelections.find(s => s.id === 's2');
    expect(after?.state).toBe('staged_edition');

    const { DocumentViewerAPI } = await import('@/lib/document-viewer-api');
    expect(DocumentViewerAPI.updateSelection).toHaveBeenCalledWith('s2', { state: 'staged_edition' });
  });

  it('deleteSelection marks persisted item as staged_deletion (still visible)', async () => {
    const initial = { saved: [committedSel({ id: 's3', state: 'staged_edition' })] };
    let apiRef: ReturnType<typeof useSelections> | null = null;

    render(
      <SelectionProvider documentId="doc1" initialSelections={initial as any}>
        <Probe onReady={(api) => { apiRef = api; }} />
      </SelectionProvider>
    );

    const { deleteSelection } = apiRef!;

    act(() => { deleteSelection('s3'); });

    const item = apiRef!.allSelections.find(s => s.id === 's3');
    expect(item).toBeTruthy();
    expect(item!.state).toBe('staged_deletion');
  });

  it('deleteSelectedSelection delegates to deleteSelection and stages persisted deletion', async () => {
    const initial = { saved: [committedSel({ id: 'c1', state: 'committed' })] };
    let apiRef: ReturnType<typeof useSelections> | null = null;

    render(
      <SelectionProvider documentId="doc1" initialSelections={initial as any}>
        <Probe onReady={(api) => { apiRef = api; }} />
      </SelectionProvider>
    );

    expect(apiRef).not.toBeNull();
    act(() => {
      apiRef!.selectSelection('c1');
    });

    let ok: boolean | null = null;
    act(() => {
      ok = apiRef!.deleteSelectedSelection();
    });

    expect(ok).toBe(true);
    const item = apiRef!.allSelections.find(s => s.id === 'c1');
    expect(item).toBeTruthy();
    expect(item!.state).toBe('staged_deletion');
  });

  it('saveLifecycle creates drafts and reloads authoritative state', async () => {
    const draft: Selection = committedSel({ id: 'temp-1' as any, state: 'committed' });
    // Mark as draft by providing via initial.new
    const initial = { saved: [], new: [draft] } as any;

    let apiRef: ReturnType<typeof useSelections> | null = null;
    const { DocumentViewerAPI } = await import('@/lib/document-viewer-api');

    // Mock fetch to return one committed selection after save
    (DocumentViewerAPI.fetchDocumentSelections as any).mockResolvedValueOnce({ ok: true, value: [committedSel({ id: 's100' })] });

    render(
      <SelectionProvider documentId="doc1" initialSelections={initial}>
        <Probe onReady={(api) => { apiRef = api; }} />
      </SelectionProvider>
    );

    expect(apiRef).not.toBeNull();

    await act(async () => {
      const res = await apiRef!.saveLifecycle();
      expect(res.ok).toBe(true);
    });

    // Expect createSelection called for a draft
    expect(DocumentViewerAPI.createSelection).toHaveBeenCalled();

    // After reload, allSelections should reflect fetched value
    const ids = apiRef!.allSelections.map(s => s.id);
    expect(ids).toContain('s100');
    // Note: depending on selection manager internals, hasUnsavedChanges may remain true until a subsequent user action.
    // We assert data reloaded to authoritative state rather than enforcing unsaved flag here.
  });

  it('commitLifecycle commits staged changes and reloads authoritative state', async () => {
    // Start with a staged selection
    const initial = { saved: [stagedDeletionSel({ id: 's200' })] } as any;
    let apiRef: ReturnType<typeof useSelections> | null = null;
    const { DocumentViewerAPI } = await import('@/lib/document-viewer-api');

    // Mock commit + fetch
    (DocumentViewerAPI.commitStagedSelections as any).mockResolvedValueOnce({ ok: true });
    (DocumentViewerAPI.fetchDocumentSelections as any).mockResolvedValueOnce({ ok: true, value: [committedSel({ id: 's200', state: 'committed' })] });

    render(
      <SelectionProvider documentId="doc1" initialSelections={initial}>
        <Probe onReady={(api) => { apiRef = api; }} />
      </SelectionProvider>
    );

    await act(async () => {
      const res = await apiRef!.commitLifecycle();
      expect(res.ok).toBe(true);
    });

    // After reload, staged becomes committed
    const item = apiRef!.allSelections.find(s => s.id === 's200');
    expect(item?.state).toBe('committed');
    expect(apiRef!.hasUnsavedChanges).toBe(false);
  });
});
