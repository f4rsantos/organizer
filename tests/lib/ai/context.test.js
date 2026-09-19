import { describe, it, expect } from 'vitest'
import { buildContextBlock, buildCustomInstructionsBlock, buildFollowUpOfferBlock, buildSystemPrompt, scopedEntities, CUSTOM_INSTRUCTIONS_MAX_LENGTH } from '../../../src/lib/ai/context'

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

describe('buildContextBlock balanced mode', () => {
  it('includes full task and event lines', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'balanced', now: NOW })
    expect(block).toContain('t1')
    expect(block).toContain('Essay draft')
    expect(block).toContain('TASKS')
    expect(block).toContain('e1')
    expect(block).toContain('EVENTS')
  })

  it('omits note, habit, class, folder and kanban index lines, keeping only the summary count', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'balanced', now: NOW })
    expect(block).not.toContain('NOTES')
    expect(block).not.toContain('n1')
    expect(block).not.toContain('HABITS')
    expect(block).not.toContain('CLASSES')
    expect(block).not.toContain('FOLDERS')
    expect(block).toMatch(/notes/)
  })

  it('never includes note body text', () => {
    const block = buildContextBlock({ store: buildStore(), optimizeFor: 'balanced', now: NOW })
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

  it('tells balanced mode to use query and fetch for anything not front-loaded', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'balanced' })
    expect(prompt).toMatch(/query/)
    expect(prompt).toMatch(/fetch/)
  })

  it('omits the user preferences block when no custom instructions are set', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'requests' })
    expect(prompt).not.toMatch(/USER PREFERENCES/)
  })

  it('appends the user preferences block when custom instructions are set', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'requests', customInstructions: 'Always keep tasks short.' })
    expect(prompt).toMatch(/USER PREFERENCES/)
    expect(prompt).toContain('Always keep tasks short.')
  })

  it('instructs the model to offer an obvious follow-up after finishing', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'requests' })
    expect(prompt).toMatch(/optional next step/)
  })

  it('instructs the model to read a later reply as an answer to its own follow-up', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'requests' })
    expect(prompt).toMatch(/answer.*follow-up question|follow-up question.*answer/i)
  })

  it('mentions reminderOffsetHours so the model knows how to act on a follow-up', () => {
    const prompt = buildSystemPrompt({ optimizeFor: 'requests' })
    expect(prompt).toMatch(/reminderOffsetHours/)
  })
})

describe('buildFollowUpOfferBlock', () => {
  it('is a non-empty pure string with no side effects', () => {
    const first = buildFollowUpOfferBlock()
    const second = buildFollowUpOfferBlock()
    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)
  })

  it('tells the model to phrase the offer as a question', () => {
    expect(buildFollowUpOfferBlock()).toMatch(/question/)
  })
})

describe('buildCustomInstructionsBlock', () => {
  it('returns an empty string for nothing set', () => {
    expect(buildCustomInstructionsBlock(undefined)).toBe('')
    expect(buildCustomInstructionsBlock(null)).toBe('')
    expect(buildCustomInstructionsBlock('')).toBe('')
    expect(buildCustomInstructionsBlock('   ')).toBe('')
  })

  it('trims surrounding whitespace and includes the text', () => {
    const block = buildCustomInstructionsBlock('  Prefer Portuguese in note titles.  ')
    expect(block).toContain('Prefer Portuguese in note titles.')
    expect(block).not.toMatch(/^\s/)
  })

  it('clips text to the max length instead of erroring', () => {
    const long = 'a'.repeat(CUSTOM_INSTRUCTIONS_MAX_LENGTH + 500)
    const block = buildCustomInstructionsBlock(long)
    expect(block.length).toBeLessThanOrEqual(CUSTOM_INSTRUCTIONS_MAX_LENGTH + 200)
    expect(block).toContain('a'.repeat(CUSTOM_INSTRUCTIONS_MAX_LENGTH))
    expect(block).not.toContain('a'.repeat(CUSTOM_INSTRUCTIONS_MAX_LENGTH + 1))
  })

  it('labels the block clearly as user preferences', () => {
    const block = buildCustomInstructionsBlock('Never touch my calendar without asking.')
    expect(block).toMatch(/USER PREFERENCES/)
  })
})
