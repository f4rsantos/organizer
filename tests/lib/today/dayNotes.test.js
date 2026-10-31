import { describe, it, expect } from 'vitest'
import { dayNotes } from '../../../src/lib/today/dayNotes.js'

function kinds(notes) {
  return notes.map(note => note.kind)
}

describe('dayNotes', () => {
  it('warns about rain from the hour it becomes likely', () => {
    const notes = dayNotes({ forecastDay: { code: 61, max: 18, min: 11, rainFrom: '16:00' } })
    expect(notes).toContainEqual({ kind: 'rain', from: '16:00' })
  })

  it('flags snow, storms, heat and cold', () => {
    expect(kinds(dayNotes({ forecastDay: { code: 95, max: 20, min: 12, rainFrom: null } }))).toContain('storm')
    expect(kinds(dayNotes({ forecastDay: { code: 73, max: 1, min: -4, rainFrom: null } }))).toEqual(['snow', 'cold'])
    expect(kinds(dayNotes({ forecastDay: { code: 0, max: 34, min: 20, rainFrom: null } }))).toEqual(['hot'])
  })

  it('says nothing about a mild dry day', () => {
    expect(dayNotes({ forecastDay: { code: 1, max: 21, min: 12, rainFrom: null } })).toEqual([])
  })

  it('mentions a holiday today and the habits still open', () => {
    const notes = dayNotes({ holiday: { name: 'Implantação da República' }, habitsPending: 2 })
    expect(notes).toEqual([{ kind: 'holiday', name: 'Implantação da República' }, { kind: 'habits', count: 2 }])
  })
})
