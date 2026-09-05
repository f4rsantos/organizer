import { describe, it, expect } from 'vitest'
import { encodeSlices, decodeSlices, aadForLocalSlice } from '../lib/crypto'
import { normalizeState } from './migrations'

const OLD_STATE = {
  version: 9, theme: 'dark', lang: 'pt', onboardingDone: true,
  activeSemesterId: 'sem-1',
  semesters: [{ id: 'sem-1', name: '2o Semestre', startDate: '2026-02-09', endDate: '2026-06-03' }],
  classes: [{ id: 'c1', semesterId: 'sem-1', name: 'CD', color: '#f97316' }],
  tasks: [{ id: 't1', title: 'Report', semesterId: 'sem-1', weekStart: 1, weekEnd: 1 }],
  events: [{ id: 'e1', title: 'Old event', date: '2026-03-02', semesterId: 'sem-1' }],
  notes: [{ id: 'n1', title: 'Note', kind: 'text', body: 'hi' }],
  settings: { defaultTab: 'last' },
}

describe('existing saves are not harmed', () => {
  it('a container written before scheduleImports existed still decodes', async () => {
    const container = await encodeSlices({
      state: OLD_STATE, key: null, aadFor: aadForLocalSlice,
    })
    delete container.slices.scheduleImports

    const decoded = await decodeSlices({ container, key: null, aadFor: aadForLocalSlice })
    const out = normalizeState(decoded)

    expect(out.semesters).toHaveLength(1)
    expect(out.classes[0].name).toBe('CD')
    expect(out.tasks).toHaveLength(1)
    expect(out.events[0].title).toBe('Old event')
    expect(out.notes[0].body).toBe('hi')
    expect(out.theme).toBe('dark')
    expect(out.activeSemesterId).toBe('sem-1')
  })

  it('fills scheduleImports in without touching anything else', async () => {
    const container = await encodeSlices({ state: OLD_STATE, key: null, aadFor: aadForLocalSlice })
    delete container.slices.scheduleImports
    const out = normalizeState(await decodeSlices({ container, key: null, aadFor: aadForLocalSlice }))
    expect(out.scheduleImports).toEqual([])
    expect(out.events).toHaveLength(1)
  })

  it('a plain event with no recurrence stays valid', () => {
    const out = normalizeState({ events: [{ id: 'e9', title: 'Plain', date: '2026-04-01' }] })
    expect(out.events[0].title).toBe('Plain')
    expect(out.events[0].recurrence).toBeNull()
    expect(out.events[0].importId).toBeNull()
  })
})
