import { describe, it, expect } from 'vitest'
import { UISelectionStage } from '@/components/features/document-viewer/types/selection-lifecycle'
import { fromApiSelection, mergeServerResponse, toApiCreate, toApiUpdate } from '@/components/features/document-viewer/core/selection-lifecycle-mapper'

const baseSel = {
  id: 's1', x: 0.1, y: 0.1, width: 0.2, height: 0.2, page_number: 0,
  confidence: 1, document_id: 'doc1', created_at: '', updated_at: '', is_ai_generated: false,
  scope: 'document', is_global_page: false,
}

describe('selection-lifecycle-mapper', () => {
  it('fromApiSelection maps committed', () => {
    const api = { ...baseSel, state: 'committed' } as any
    const ui = fromApiSelection(api)
    expect(ui.stage).toBe(UISelectionStage.Committed)
    expect(ui.isPersisted).toBe(true)
    expect(ui.dirty).toBe(false)
  })

  it('fromApiSelection maps staged_edition', () => {
    const api = { ...baseSel, state: 'staged_edition' } as any
    const ui = fromApiSelection(api)
    expect(ui.stage).toBe(UISelectionStage.StagedEdition)
  })

  it('toApiCreate strips lifecycle fields', () => {
    const ui = { ...baseSel, stage: UISelectionStage.Unstaged, isPersisted: false, dirty: true } as any
    const out = toApiCreate(ui)
    expect((out as any).stage).toBeUndefined()
    expect((out as any).dirty).toBeUndefined()
  })

  it('toApiUpdate maps stage to state', () => {
    const ui = { ...baseSel, stage: UISelectionStage.StagedDeletion, isPersisted: true, dirty: true } as any
    const out = toApiUpdate(ui)
    expect((out as any).state).toBe('staged_deletion')
  })

  it('mergeServerResponse adopts server state and resets dirty', () => {
    const ui = { ...baseSel, stage: UISelectionStage.StagedEdition, isPersisted: true, dirty: true } as any
    const api = { ...baseSel, state: 'committed' } as any
    const merged = mergeServerResponse(ui, api)
    expect(merged.stage).toBe(UISelectionStage.Committed)
    expect(merged.dirty).toBe(false)
    expect(merged.isPersisted).toBe(true)
  })
})

