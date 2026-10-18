import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildProjection } from '../../../src/lib/widgets/projection.js'
import { isValidOp } from '../../../src/lib/widgets/mutations.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const ANDROID_WIDGETS = join(ROOT, 'android/app/src/main/java/io/github/f4rsantos/organizer/widgets')
const IOS_SOURCES = [
  join(ROOT, 'ios/App/Shared/WidgetShared.swift'),
  join(ROOT, 'ios/App/Shared/OrganizerActivityAttributes.swift'),
  ...readdirSync(join(ROOT, 'ios/App/OrganizerWidgets')).filter(f => f.endsWith('.swift')).map(f => join(ROOT, 'ios/App/OrganizerWidgets', f)),
]
const KOTLIN_SOURCES = readdirSync(ANDROID_WIDGETS).filter(f => f.endsWith('.kt')).map(f => join(ANDROID_WIDGETS, f))

const TODAY = '2026-08-11'
const NOW = new Date(`${TODAY}T09:00:00`)

const RICH_STATE = {
  lang: 'en',
  settings: { semesterMode: 'none', apps: { habits: true }, pomodoro: { enabled: true, resetPeriod: 'week' }, focus: { intervalMins: 25 } },
  classes: [{ id: 'c1', name: 'Maths', color: '#6366f1' }],
  tasks: [
    { id: 't1', title: 'Essay', done: false, dueDate: TODAY, classId: 'c1' },
    { id: 't2', title: 'Late', done: false, dueDate: '2026-08-01', classId: 'c1' },
    { id: 't3', title: 'Card', done: false, views: { kanban: true }, kanban: { columnId: 'k1', order: 0 } },
  ],
  events: [
    { id: 'e1', title: 'Lecture', date: TODAY, startTime: '09:00', endTime: '10:00' },
    { id: 'e2', title: 'Holiday', date: TODAY },
  ],
  kanban: {
    __free__: {
      columns: [{ id: 'k1', title: 'Todo', order: 0 }],
    },
  },
  habits: [{ id: 'h1', title: 'Run', color: '#16a34a', cadence: 'daily', checkIns: {} }],
  pomodoros: [{ id: 'p1', pct: 1, createdAt: NOW.getTime() - 1000 }],
  focusSync: { status: 'started', phase: 'focus', startedAt: NOW.getTime() - 60000, cycleElapsedBase: 0 },
}

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys)
    return keys
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key)
      collectKeys(child, keys)
    }
  }
  return keys
}

function matches(files, pattern) {
  const found = new Set()
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) found.add(match[1])
  }
  return [...found]
}

function swiftProjectionFields() {
  const source = readFileSync(IOS_SOURCES[0], 'utf8')
  const structs = source.slice(source.indexOf('struct WidgetProjection'))
  return [...structs.matchAll(/^\s+let (\w+):/gm)].map(m => m[1])
}

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterAll(() => {
  vi.useRealTimers()
})

describe('native widget contract', () => {
  const projectionKeys = () => collectKeys(buildProjection(RICH_STATE, NOW))

  it('every projection key the Android widgets read is one the JS projection emits', () => {
    const keys = projectionKeys()
    const writtenByAndroid = new Set(matches(KOTLIN_SOURCES, /\.put\("(\w+)"/g))
    const read = matches(KOTLIN_SOURCES, /\.opt(?:JSONArray|JSONObject|String|Int|Boolean|Long|Double)\("(\w+)"/g)
    expect(read.filter(key => !keys.has(key) && !writtenByAndroid.has(key))).toEqual([])
  })

  it('every projection field the iOS widgets decode is one the JS projection emits', () => {
    const keys = projectionKeys()
    expect(swiftProjectionFields().filter(key => !keys.has(key))).toEqual([])
  })

  it('every op type a native widget enqueues is accepted by the replay', () => {
    const kotlinTypes = matches(KOTLIN_SOURCES, /put\("type", "(\w+)"\)/g)
    const swiftTypes = matches(IOS_SOURCES, /enqueueOp\(type: "(\w+)"/g)
    expect(swiftTypes.length).toBeGreaterThan(0)
    const types = [...kotlinTypes, ...swiftTypes]
    expect(types.length).toBeGreaterThan(0)
    const rejected = types.filter(type => !isValidOp({ id: 'x', ts: 1, type, done: true, columnId: 'c', running: true }))
    expect(rejected).toEqual([])
  })
})
