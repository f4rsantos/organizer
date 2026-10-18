import { describe, it, expect } from 'vitest'
import { focusCommandPatch, gradeComponentsAfter } from '../../../src/lib/quickAction/commands.js'

describe('focus commands', () => {
  it('pausing a running focus session banks the elapsed time', () => {
    const sync = { status: 'started', phase: 'focus', startedAt: 1000, totalElapsedBase: 60, cycleElapsedBase: 30 }
    expect(focusCommandPatch({ action: 'pause' }, sync, 1100).sync).toEqual({
      status: 'paused', startedAt: null, totalElapsedBase: 160, cycleElapsedBase: 130,
    })
  })

  it('pausing during a break shortens the remaining break instead', () => {
    const sync = { status: 'started', phase: 'break', startedAt: 1000, breakSecsLeftBase: 300 }
    expect(focusCommandPatch({ action: 'pause' }, sync, 1100).sync).toEqual({
      status: 'paused', startedAt: null, breakSecsLeftBase: 200,
    })
  })

  it('resuming a paused session keeps its banked time', () => {
    const sync = { status: 'paused', phase: 'focus', startedAt: null, totalElapsedBase: 600 }
    expect(focusCommandPatch({ action: 'resume' }, sync, 2000).sync).toEqual({ status: 'started', startedAt: 2000 })
  })

  it('starting with custom lengths updates the focus settings', () => {
    const patch = focusCommandPatch({ action: 'start', workMins: 50, breakMins: 10 }, null, 0)
    expect(patch.settings).toEqual({ intervalMins: 50, intervalBreakMins: 10 })
    expect(patch.sync.status).toBe('started')
  })

  it('skipping a break does nothing while focusing', () => {
    expect(focusCommandPatch({ action: 'skipBreak' }, { phase: 'focus' }, 0).sync).toBe(null)
  })
})

describe('grade commands', () => {
  const components = [{ id: 'c1', name: 'Exam 1', weight: 0.4, grade: null }]
  const newId = () => 'new'

  it('records a grade on the component named in the command', () => {
    const next = gradeComponentsAfter({ type: 'setGrade', componentName: 'exam 1', grade: 15 }, components, newId)
    expect(next).toEqual([{ id: 'c1', name: 'Exam 1', weight: 0.4, grade: 15, subcomponents: undefined }])
  })

  it('adds a component when the grade names one that does not exist yet', () => {
    const next = gradeComponentsAfter({ type: 'setGrade', componentName: 'Project', grade: 18 }, components, newId)
    expect(next.at(-1)).toEqual({ id: 'new', name: 'Project', weight: 0.25, grade: 18 })
  })

  it('updates the weight of an existing component instead of duplicating it', () => {
    const next = gradeComponentsAfter({ type: 'addComponent', componentName: 'exam 1', weight: 0.5 }, components, newId)
    expect(next).toEqual([{ id: 'c1', name: 'Exam 1', weight: 0.5, grade: null }])
  })
})
