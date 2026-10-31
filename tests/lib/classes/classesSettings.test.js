import { describe, it, expect } from 'vitest'
import { normalizeClassesSettings } from '../../../src/lib/classes/classesSettings.js'

describe('normalizeClassesSettings', () => {
  it('gives a new user the standard study steps and lesson types', () => {
    const settings = normalizeClassesSettings(undefined)
    expect(settings.studySteps.map(s => s.id)).toEqual(['attend', 'slides', 'exercises', 'summary'])
    expect(settings.lessonTypes.map(s => s.id)).toEqual(['T', 'TP', 'P', 'PL', 'OT', 'S', 'FORA', 'EST'])
  })

  it('upgrades the old untouched default lesson types to the schedule codes', () => {
    const legacy = { lessonTypes: [{ id: 'T' }, { id: 'TP' }, { id: 'P' }, { id: 'PL' }, { id: 'other' }] }
    expect(normalizeClassesSettings(legacy).lessonTypes.map(s => s.id)).toEqual(['T', 'TP', 'P', 'PL', 'OT', 'S', 'FORA', 'EST'])
  })

  it('keeps custom steps and types while dropping malformed entries', () => {
    const settings = normalizeClassesSettings({
      studySteps: [{ id: 'attend' }, { id: 'cards', label: 'Flashcards' }, { label: 'no id' }, 'junk'],
      lessonTypes: [{ id: 'T' }, { id: 'seminar', label: 'Seminar' }],
    })
    expect(settings.studySteps).toEqual([{ id: 'attend' }, { id: 'cards', label: 'Flashcards' }])
    expect(settings.lessonTypes).toEqual([{ id: 'T' }, { id: 'seminar', label: 'Seminar' }])
  })

  it('opens in the overview unless the user picked the table', () => {
    expect(normalizeClassesSettings(undefined).view).toBe('overview')
    expect(normalizeClassesSettings({ view: 'table' }).view).toBe('table')
    expect(normalizeClassesSettings({ view: 'grid' }).view).toBe('overview')
  })

  it('never leaves the user with zero study steps', () => {
    expect(normalizeClassesSettings({ studySteps: [] }).studySteps.length).toBeGreaterThan(0)
  })
})
