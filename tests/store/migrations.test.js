import { describe, it, expect } from 'vitest'
import { normalizeState, CURRENT_VERSION } from '../../src/store/migrations'

function baseRawState() {
  return {
    version: CURRENT_VERSION,
    theme: 'system',
    lang: 'en',
    onboardingDone: true,
    activeSemesterId: null,
    semesters: [],
    classes: [],
    tasks: [],
    events: [],
    notes: [],
    noteFolders: [],
    habits: [],
    kanban: {},
    grades: {},
  }
}

describe('normalizeState agentRuntime / agentJournal', () => {
  it('normalises cleanly when both slices are absent', () => {
    const state = normalizeState(baseRawState())
    expect(state.agentRuntime).toEqual({ runs: {}, activeRunId: null })
    expect(state.agentJournal).toEqual({ entries: [] })
  })

  it('loads an old state without these keys unchanged otherwise', () => {
    const raw = baseRawState()
    const state = normalizeState(raw)
    expect(state.tasks).toEqual([])
    expect(state.theme).toBe('system')
  })

  it('marks a planning run as interrupted on boot, keeping its ops', () => {
    const raw = {
      ...baseRawState(),
      agentRuntime: {
        activeRunId: 'r1',
        runs: {
          r1: {
            id: 'r1', status: 'planning', scope: { type: 'global' }, slot: 'a', model: 'sonnet',
            ops: [{ type: 'create', entityType: 'task', id: 't1', entity: { title: 'x' } }],
            inverse: [],
            entities: { tasks: [{ id: 't1' }], events: [], notes: [], kanban: { cards: [] }, folders: [] },
          },
        },
      },
    }
    const state = normalizeState(raw)
    expect(state.agentRuntime.runs.r1.status).toBe('interrupted')
    expect(state.agentRuntime.runs.r1.ops).toHaveLength(1)
  })

  it('marks an applying run as interrupted on boot', () => {
    const raw = {
      ...baseRawState(),
      agentRuntime: {
        activeRunId: 'r1',
        runs: { r1: { id: 'r1', status: 'applying', ops: [], inverse: [] } },
      },
    }
    const state = normalizeState(raw)
    expect(state.agentRuntime.runs.r1.status).toBe('interrupted')
  })

  it('leaves an awaitingConfirm run intact and still confirmable after reload', () => {
    const raw = {
      ...baseRawState(),
      agentRuntime: {
        activeRunId: 'r1',
        runs: {
          r1: {
            id: 'r1', status: 'awaitingConfirm', scope: { type: 'global' }, slot: 'a', model: 'sonnet',
            ops: [{ type: 'create', entityType: 'task', id: 't1', entity: { title: 'x' } }],
            inverse: [{ type: 'delete', entityType: 'task', targetId: 't1' }],
          },
        },
      },
    }
    const state = normalizeState(raw)
    expect(state.agentRuntime.runs.r1.status).toBe('awaitingConfirm')
    expect(state.agentRuntime.activeRunId).toBe('r1')
    expect(state.agentRuntime.runs.r1.ops).toHaveLength(1)
  })

  it('drops a stale activeRunId that no longer points at a run', () => {
    const raw = { ...baseRawState(), agentRuntime: { activeRunId: 'gone', runs: {} } }
    const state = normalizeState(raw)
    expect(state.agentRuntime.activeRunId).toBeNull()
  })

  it('defaults entities to the empty shape when a run was persisted without them', () => {
    const raw = {
      ...baseRawState(),
      agentRuntime: {
        activeRunId: 'r1',
        runs: { r1: { id: 'r1', status: 'committed', ops: [], inverse: [] } },
      },
    }
    const state = normalizeState(raw)
    expect(state.agentRuntime.runs.r1.entities).toEqual({ tasks: [], events: [], notes: [], kanban: { cards: [] }, folders: [] })
  })
})

describe('normalizeState settings.apps.aiAssistant', () => {
  it('keeps aiAssistant enabled across a reload instead of silently dropping it', () => {
    const raw = {
      ...baseRawState(),
      settings: { apps: { aiAssistant: true } },
    }
    const state = normalizeState(raw)
    expect(state.settings.apps.aiAssistant).toBe(true)
  })

  it('defaults aiAssistant to false when absent', () => {
    const state = normalizeState({ ...baseRawState(), settings: { apps: {} } })
    expect(state.settings.apps.aiAssistant).toBe(false)
  })

  it('keeps the ai config object (slots, optimizeFor) across a reload', () => {
    const raw = {
      ...baseRawState(),
      settings: {
        apps: {
          aiAssistant: true,
          ai: { optimizeFor: 'tokens', slots: { medium: { provider: 'gemini', model: 'gemini-flash' } } },
        },
      },
    }
    const state = normalizeState(raw)
    expect(state.settings.apps.ai).toEqual({
      optimizeFor: 'tokens',
      slots: { medium: { provider: 'gemini', model: 'gemini-flash' } },
    })
  })

  it('keeps eisenhowerQuadrants across a reload', () => {
    const raw = {
      ...baseRawState(),
      settings: { apps: { eisenhower: true, eisenhowerQuadrants: { q1: { label: 'Now' } } } },
    }
    const state = normalizeState(raw)
    expect(state.settings.apps.eisenhowerQuadrants).toEqual({ q1: { label: 'Now' } })
  })

  it('preserves an unknown future plugin config key instead of dropping it', () => {
    const raw = { ...baseRawState(), settings: { apps: { somethingNew: { foo: 'bar' } } } }
    const state = normalizeState(raw)
    expect(state.settings.apps.somethingNew).toEqual({ foo: 'bar' })
  })
})
