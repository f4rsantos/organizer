import { describe, it, expect } from 'vitest'
import { normalizeState } from './migrations.js'

// checklistPreview is a per-card flag set from the card detail dialog. It lives
// inside task.kanban, which normalizeState rebuilds field by field, so a field
// missing from that rebuild is silently dropped on every load.
describe('kanban checklistPreview persistence', () => {
  const stateWith = preview => ({
    tasks: [{
      id: 't1',
      title: 'Relatorio',
      kanban: { columnId: 'c1', order: 0, checklist: [], checklistPreview: preview },
    }],
  })

  it('survives normalization when enabled', () => {
    const out = normalizeState(stateWith(true))
    expect(out.tasks[0].kanban.checklistPreview).toBe(true)
  })

  it('stays false when disabled', () => {
    const out = normalizeState(stateWith(false))
    expect(out.tasks[0].kanban.checklistPreview).toBe(false)
  })

  it('defaults to false when absent', () => {
    const out = normalizeState({
      tasks: [{ id: 't1', title: 'x', kanban: { columnId: 'c1', order: 0, checklist: [] } }],
    })
    expect(out.tasks[0].kanban.checklistPreview).toBe(false)
  })
})
