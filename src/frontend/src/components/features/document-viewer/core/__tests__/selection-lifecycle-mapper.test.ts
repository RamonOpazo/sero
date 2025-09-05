import { describe, it, expect } from 'vitest'
import { UILifecycleStage } from '@/components/features/document-viewer/types/lifecycle'
import { fromApiSelection, mergeServerResponse, toApiCreate, toApiUpdate } from '@/components/features/document-viewer/core/mappers/selection-lifecycle-mapper'

const baseSel = {
  id: 's1', x: 0.1, y: 0.1, width: 0.2, height: 0.2, page_number: 0,
  confidence: 1, document_id: 'doc1', created_at: '', updated_at: '', is_ai_generated: false,
  scope: 'document', is_global_page: false,
}

describe('selection-lifecycle-mapper', () => {
  it('fromApiSelection maps committed', () => {
    const api = { ...baseSel, state: 'committed' } as any
    const ui = fromApiSelection(api)
    expect(ui.stage).toBe(UILifecycleStage.Committed)
    expect(ui.isSaved).toBe(true)
    expect(ui.isDirty).toBe(false)
  })

  it('fromApiSelection maps staged_edition', () => {
    const api = { ...baseSel, state: 'staged_edition' } as any
    const ui = fromApiSelection(api)
    expect(ui.stage).toBe(UILifecycleStage.StagedEdition)
  })

  it('toApiCreate strips lifecycle fields', () => {
    const ui = { ...baseSel, stage: UILifecycleStage.Unstaged, isPersisted: false, dirty: true } as any
    const out = toApiCreate(ui)
    expect((out as any).stage).toBeUndefined()
    expect((out as any).isDirty).toBeUndefined()
  })

  it('toApiUpdate maps stage to state', () => {
    const ui = { ...baseSel, stage: UILifecycleStage.StagedDeletion, isPersisted: true, dirty: true } as any
    const out = toApiUpdate(ui)
    expect((out as any).state).toBe('staged_deletion')
  })

  it('mergeServerResponse adopts server state and resets dirty', () => {
    const ui = { ...baseSel, stage: UILifecycleStage.StagedEdition, isPersisted: true, dirty: true } as any
    const api = { ...baseSel, state: 'committed' } as any
    const merged = mergeServerResponse(ui, api)
    expect(merged.stage).toBe(UILifecycleStage.Committed)
    expect(merged.isDirty).toBe(false)
    expect(merged.isSaved).toBe(true)
  })
})

