import { describe, it, expect } from 'vitest'
import { buildContextBlock, buildSystemPrompt, scopedEntities } from './context'

const NOW = new Date('2026-09-12T00:00:00.000Z')

function buildStore() {
  return {
    classes: [{ id: 'c1', name: 'PHIL', semesterId: 's1' }],
    tasks: [
      { id: 't1', title: 'Essay draft', dueDate: '2026-09-15', classId: 'c1', views: { kanban: true }, kanban: { columnId: 'doing' } },
      { id: 't2', title: 'Done thing', dueDate: '2026-09-01', done: true, views: {} },
    ],
    events: [{ id: 'e1', title: 'Lecture', date: '2026-09-13' }],
    notes: [
      { id: 'n1', title: 'Kant reading', folderId: 'f1', body: 'x'.repeat(1200) },
      { id: 'n2', title: 'Short', folderId: null, body: 'hi' },
    ],
    noteFolders: [{ id: 'f1', name: 'PHIL', parentId: null }],
    habits: [{ id: 'h1', title: 'Read daily' }],
  }
}

describe('buildContextBlock requests mode', () => {
  it('includes ids, titles and dates for the whole working set', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'requests', now: NOW })
    expect(block).toContain('t1')
    expect(block).toContain('Essay draft')
    expect(block).toContain('due 2026-09-15')
    expect(block).toContain('class:PHIL')
    expect(block).toContain('col:doing')
    expect(block).toContain('n1')
    expect(block).toContain('"Kant reading"')
    expect(block).toContain('folder:PHIL')
  })

  it('never includes note body text', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'requests', now: NOW })
    expect(block).not.toContain('x'.repeat(50))
  })

  it('includes a size hint instead of the body', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'requests', now: NOW })
    expect(block).toMatch(/1\.2k/)
  })
})

describe('buildContextBlock tokens mode', () => {
  it('omits per-entity index lines and keeps only the summary', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'tokens', now: NOW })
    expect(block).not.toContain('t1')
    expect(block).not.toContain('TASKS')
    expect(block).toMatch(/classes/)
  })

  it('never includes note body text', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'tokens', now: NOW })
    expect(block).not.toContain('x'.repeat(50))
  })
})

describe('scope narrowing', () => {
  it('a folder-scoped run excludes notes from other folders', () => {
    const store = buildStore()
    const entities = scopedEntities(store, { type: 'folder', folderId: 'f1' })
    expect(entities.notes.map(n => n.id)).toEqual(['n1'])
  })

  it('a folder-scoped run does not include unrelated tasks scoped by id', () => {
    const store = buildStore()
    const entities = scopedEntities(store, { type: 'ids', ids: ['t1'] })
    expect(entities.tasks.map(t => t.id)).toEqual(['t1'])
  })

  it('an unscoped run includes everything', () => {
    const store = buildStore()
    const entities = scopedEntities(store, null)
    expect(entities.notes).toHaveLength(2)
    expect(entities.tasks).toHaveLength(2)
  })
})

describe('buildSystemPrompt', () => {
  it('instructs batching every op in one turn', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'requests' })
    expect(prompt).toMatch(/single turn/)
  })

  it('tells requests mode not to call query', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'requests' })
    expect(prompt).toMatch(/Do not call query/)
  })

  it('tells tokens mode to use query and fetch', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'tokens' })
    expect(prompt).toMatch(/query/)
    expect(prompt).toMatch(/fetch/)
  })
})
