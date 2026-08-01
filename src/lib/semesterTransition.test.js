import { describe, it, expect } from 'vitest'
import { getNextPresetKey, countsTowardCourseAvg } from './presets'
import { foldSemesterIntoAvg } from './gradeUtils'
import {
  buildClassIdMap,
  countCarryCandidates,
  remapCarriedEvents,
  remapCarriedTasks,
} from './semesterTransition'

const OLD = 'sem-old'
const NEW = 'sem-new'
const FROM = '2026-09-14'

const ALL = { kanban: true, tasks: true, events: true }

describe('preset key progression', () => {
  it('sends 2a2s to summer, not 3a1s', () => {
    expect(getNextPresetKey('2a2s')).toBe('summer')
  })

  it('sends summer back into the course using previousPresetKey', () => {
    expect(getNextPresetKey('summer', '2a2s')).toBe('3a1s')
  })

  it('falls back to s1 when summer has no previous key', () => {
    expect(getNextPresetKey('summer')).toBe('s1')
  })
})

describe('countsTowardCourseAvg', () => {
  it('counts a regular semester', () => {
    expect(countsTowardCourseAvg('2a2s')).toBe(true)
  })

  it('does not count summer', () => {
    expect(countsTowardCourseAvg('summer')).toBe(false)
  })
})

describe('foldSemesterIntoAvg', () => {
  it('averages the new gpa into the running average', () => {
    expect(foldSemesterIntoAvg(14, 3, 16)).toBe(14.5)
  })

  it('uses the gpa alone when there is no history', () => {
    expect(foldSemesterIntoAvg(null, 0, 15)).toBe(15)
  })

  it('leaves the average untouched when the gpa is unknown', () => {
    expect(foldSemesterIntoAvg(14, 3, null)).toBe(14)
  })
})

describe('carry-over candidates', () => {
  const tasks = [
    { id: 'kanban-open', semesterId: OLD, done: false, kanban: { columnId: 'c1' }, weekEnd: '2026-05-01' },
    { id: 'kanban-done', semesterId: OLD, done: true, kanban: { columnId: 'c1' }, weekEnd: '2026-05-01' },
    { id: 'upcoming', semesterId: OLD, done: false, kanban: null, weekEnd: '2026-10-02' },
    { id: 'past', semesterId: OLD, done: false, kanban: null, weekEnd: '2026-05-01' },
    { id: 'other-sem', semesterId: 'sem-x', done: false, kanban: null, weekEnd: '2026-10-02' },
  ]
  const events = [
    { id: 'future', semesterId: OLD, date: '2026-10-02' },
    { id: 'past', semesterId: OLD, date: '2026-05-01' },
    { id: 'spanning', semesterId: OLD, startDate: '2026-09-01', endDate: '2026-09-20' },
  ]

  it('counts only open kanban cards and dated-forward items', () => {
    expect(countCarryCandidates({ tasks, events }, OLD, FROM)).toEqual({
      kanban: 1,
      tasks: 1,
      events: 2,
    })
  })

  it('moves carried tasks to the new semester and drops unmatched classes', () => {
    const result = remapCarriedTasks(tasks, {
      oldSemesterId: OLD,
      newSemesterId: NEW,
      fromDate: FROM,
      carry: ALL,
      classIdByOldId: {},
    })
    expect(result.find(t => t.id === 'kanban-open').semesterId).toBe(NEW)
    expect(result.find(t => t.id === 'upcoming').semesterId).toBe(NEW)
    expect(result.find(t => t.id === 'past').semesterId).toBe(OLD)
    expect(result.find(t => t.id === 'kanban-done').semesterId).toBe(OLD)
    expect(result.find(t => t.id === 'other-sem').semesterId).toBe('sem-x')
  })

  it('leaves tasks alone when both task carries are off', () => {
    const result = remapCarriedTasks(tasks, {
      oldSemesterId: OLD,
      newSemesterId: NEW,
      fromDate: FROM,
      carry: { kanban: false, tasks: false, events: true },
      classIdByOldId: {},
    })
    expect(result).toEqual(tasks)
  })

  it('moves only forward-dated events', () => {
    const result = remapCarriedEvents(events, {
      oldSemesterId: OLD,
      newSemesterId: NEW,
      fromDate: FROM,
      carry: ALL,
    })
    expect(result.find(e => e.id === 'future').semesterId).toBe(NEW)
    expect(result.find(e => e.id === 'spanning').semesterId).toBe(NEW)
    expect(result.find(e => e.id === 'past').semesterId).toBe(OLD)
  })

  it('leaves events alone when the event carry is off', () => {
    const result = remapCarriedEvents(events, {
      oldSemesterId: OLD,
      newSemesterId: NEW,
      fromDate: FROM,
      carry: { ...ALL, events: false },
    })
    expect(result).toBe(events)
  })
})

describe('buildClassIdMap', () => {
  const classes = [
    { id: 'old-a', semesterId: OLD, name: 'Análise' },
    { id: 'old-b', semesterId: OLD, name: 'Gone' },
    { id: 'new-a', semesterId: NEW, name: 'Análise' },
  ]

  it('links classes that carry the same name and nulls the rest', () => {
    expect(buildClassIdMap(classes, OLD, NEW)).toEqual({ 'old-a': 'new-a', 'old-b': null })
  })

  it('reassigns a carried task onto the matching new class', () => {
    const tasks = [{ id: 't', semesterId: OLD, done: false, kanban: { columnId: 'c' }, classId: 'old-a' }]
    const result = remapCarriedTasks(tasks, {
      oldSemesterId: OLD,
      newSemesterId: NEW,
      fromDate: FROM,
      carry: ALL,
      classIdByOldId: buildClassIdMap(classes, OLD, NEW),
    })
    expect(result[0].classId).toBe('new-a')
  })
})
