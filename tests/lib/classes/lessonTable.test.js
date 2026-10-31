import { describe, it, expect } from 'vitest'
import { lessonTableRows } from '../../../src/lib/classes/lessonTable.js'

const STEPS = [{ id: 'attend' }, { id: 'slides' }]
const CALC = { id: 'c1', name: 'Cálculo' }
const PHYS = { id: 'c2', name: 'Física' }

const SUMMARIES = [
  { cls: CALC, sessions: [
    { key: 'a', date: '2026-10-05', type: 'T', studied: { attend: true, slides: true } },
    { key: 'b', date: '2026-10-12', type: 'TP', studied: {} },
  ] },
  { cls: PHYS, sessions: [
    { key: 'c', date: '2026-10-08', type: 'T', studied: { attend: true } },
  ] },
]

function keys(options) {
  return lessonTableRows(SUMMARIES, STEPS, { classId: 'all', type: 'all', status: 'all', sort: { key: 'date', dir: 'desc' }, ...options })
    .map(row => row.session.key)
}

describe('lessonTableRows', () => {
  it('lists every lesson of every class newest first by default', () => {
    expect(keys()).toEqual(['b', 'c', 'a'])
  })

  it('filters by class, lesson type and whether the lesson is fully studied', () => {
    expect(keys({ classId: 'c1' })).toEqual(['b', 'a'])
    expect(keys({ type: 'T' })).toEqual(['c', 'a'])
    expect(keys({ status: 'pending' })).toEqual(['b', 'c'])
    expect(keys({ status: 'done' })).toEqual(['a'])
  })

  it('sorts by class name or by progress in either direction', () => {
    expect(keys({ sort: { key: 'class', dir: 'asc' } })).toEqual(['b', 'a', 'c'])
    expect(keys({ sort: { key: 'progress', dir: 'asc' } })).toEqual(['b', 'c', 'a'])
    expect(keys({ sort: { key: 'progress', dir: 'desc' } })).toEqual(['a', 'c', 'b'])
  })

  it('sorts lesson numbers naturally, treating dots and underscores alike and leaving blanks last', () => {
    const summaries = [{ cls: CALC, sessions: [
      { key: 'x', date: '2026-10-01', type: 'T', number: '2.10', studied: {} },
      { key: 'y', date: '2026-10-02', type: 'T', number: '2_2', studied: {} },
      { key: 'z', date: '2026-10-03', type: 'T', number: '', studied: {} },
      { key: 'w', date: '2026-10-04', type: 'T', number: '2.3', studied: {} },
    ] }]
    const rows = lessonTableRows(summaries, STEPS, { classId: 'all', type: 'all', status: 'all', sort: { key: 'number', dir: 'asc' } })
    expect(rows.map(row => row.session.key)).toEqual(['y', 'w', 'x', 'z'])
  })
})
