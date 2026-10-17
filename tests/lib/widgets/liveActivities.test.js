import { describe, it, expect } from 'vitest'
import { buildLiveActivities, buildLiveActivitiesPayload } from '../../../src/lib/widgets/liveActivities.js'

const TODAY = '2026-08-11'
const NOW_MS = new Date(`${TODAY}T09:00:00`).getTime()
const at = time => new Date(`${TODAY}T${time}:00`).getTime()

const LABELS = {
  focusPhase: 'Focus', breakPhase: 'Break', upNext: 'Up next', dueSoon: 'Due soon',
  agentWorking: 'AI is working', agentReady: 'Reply ready', agentConfirm: 'Needs your OK', agentFailed: 'AI run failed',
}

function base(over = {}) {
  return {
    settings: { widgetsEnabled: true, focus: { useInterval: true, intervalMins: 25 } },
    tasks: [],
    events: [],
    focusSync: { status: 'paused', startedAt: null, cycleElapsedBase: 0, updatedAt: 0 },
    ...over,
  }
}

const kinds = list => list.map(a => a.kind)

describe('live activities', () => {
  it('shows nothing without the widgets consent', () => {
    const state = base({ settings: { widgetsEnabled: false }, events: [{ id: 'e1', title: 'Maths', date: TODAY, startTime: '09:30' }] })
    expect(buildLiveActivities(state, NOW_MS, LABELS)).toEqual([])
  })

  it('counts down to the next timed event starting within the hour', () => {
    const state = base({
      events: [
        { id: 'late', title: 'Physics', date: TODAY, startTime: '09:50' },
        { id: 'soon', title: 'Maths', date: TODAY, startTime: '09:30' },
        { id: 'far', title: 'Lunch', date: TODAY, startTime: '12:00' },
        { id: 'allday', title: 'Holiday', date: TODAY },
      ],
    })
    const [upNext] = buildLiveActivities(state, NOW_MS, LABELS)
    expect(upNext).toMatchObject({ kind: 'upNext', id: 'soon', title: 'Maths', subtitle: 'Up next', endsAtMs: at('09:30'), countFromMs: at('08:30'), timer: 'countdown' })
  })

  it('ignores events that already started', () => {
    const state = base({ events: [{ id: 'e1', title: 'Maths', date: TODAY, startTime: '08:45' }] })
    expect(kinds(buildLiveActivities(state, NOW_MS, LABELS))).toEqual([])
  })

  it('counts down to a timed task due within three hours and lets it be completed', () => {
    const state = base({
      tasks: [
        { id: 'done', title: 'Old', done: true, dueDate: TODAY, endTime: '10:00' },
        { id: 'untimed', title: 'Essay', done: false, dueDate: TODAY },
        { id: 't1', title: 'Lab report', done: false, dueDate: TODAY, startTime: '10:00', endTime: '11:00' },
        { id: 't2', title: 'Later', done: false, dueDate: TODAY, startTime: '13:00' },
      ],
    })
    const [deadline] = buildLiveActivities(state, NOW_MS, LABELS)
    expect(deadline).toMatchObject({ kind: 'deadline', id: 't1', title: 'Lab report', subtitle: 'Due soon', taskId: 't1', endsAtMs: at('11:00') })
  })

  it('shows a running AI run counting up and a finished one as ready, but not while its tab is open', () => {
    const working = base({ agentRuntime: { activeRunId: 'r1', runs: { r1: { status: 'planning', createdAt: NOW_MS - 30_000, ops: [] } } } })
    expect(buildLiveActivities(working, NOW_MS, LABELS)).toEqual([
      expect.objectContaining({ kind: 'agent', id: 'r1', title: 'AI is working', countFromMs: NOW_MS - 30_000, endsAtMs: null, timer: 'countup' }),
    ])

    const ready = base({ agentRuntime: { activeRunId: 'r1', runs: { r1: { status: 'committed', createdAt: NOW_MS - 30_000, ops: [] } } } })
    expect(buildLiveActivities(ready, NOW_MS, LABELS)[0]).toMatchObject({ kind: 'agent', title: 'Reply ready', timer: 'none' })

    expect(buildLiveActivities({ ...ready, currentTab: 'aiAssistant' }, NOW_MS, LABELS)).toEqual([])
  })

  it('wraps a running focus session with its pause control', () => {
    const startedAt = Math.floor(NOW_MS / 1000) - 60
    const state = base({ focusSync: { status: 'started', phase: 'focus', startedAt, cycleElapsedBase: 0 } })
    expect(buildLiveActivities(state, NOW_MS, LABELS)[0]).toMatchObject({
      kind: 'focus', id: 'focus', title: 'Focus', tone: 'focus', timer: 'countdown', pausedAtMs: null,
      endsAtMs: (startedAt + 1500) * 1000,
    })
  })

  it('leaves out each kind the user switched off', () => {
    const state = base({
      settings: { widgetsEnabled: true, liveActivities: { upNext: false } },
      events: [{ id: 'e1', title: 'Maths', date: TODAY, startTime: '09:30' }],
    })
    expect(buildLiveActivities(state, NOW_MS, LABELS)).toEqual([])
  })
})

describe('live activities payload', () => {
  it('lets Control Center start focus only while focus live activities are allowed', () => {
    const allowed = buildLiveActivitiesPayload(base(), NOW_MS, LABELS)
    expect(allowed.focusTemplate).toEqual({ title: 'Focus', targetSecs: 1500 })

    const switchedOff = base({ settings: { widgetsEnabled: true, liveActivities: { focus: false } } })
    expect(buildLiveActivitiesPayload(switchedOff, NOW_MS, LABELS).focusTemplate).toBeNull()

    const noConsent = base({ settings: { widgetsEnabled: false } })
    expect(buildLiveActivitiesPayload(noConsent, NOW_MS, LABELS)).toEqual({ activities: [], focusTemplate: null })
  })
})
