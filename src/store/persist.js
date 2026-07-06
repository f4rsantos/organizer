import { getPomodoroTimestamp, isPomodoroAggregate } from '../components/focus/pomodoro/utils'
import { migrateState, normalizeState } from './migrations'

const STORAGE_KEY = 'f4rsantos.github.io/organizer'
const LEGACY_FULL_PCT_UNITS = 2.5
const POMODORO_UNITS_MAX = 120
const LOCAL_CACHE_LIMIT_BYTES = Math.floor(4.8 * 1024 * 1024)

let loadWarnings = []

export function getLoadWarnings() {
  return loadWarnings
}

function buildLightweightSnapshot(state) {
  return normalizeState({
    version: Number.isFinite(state?.version) ? state.version : 1,
    theme: typeof state?.theme === 'string' ? state.theme : 'system',
    lang: typeof state?.lang === 'string' ? state.lang : 'pt',
    onboardingDone: Boolean(state?.onboardingDone),
    activeSemesterId: typeof state?.activeSemesterId === 'string' ? state.activeSemesterId : null,
    semesters: Array.isArray(state?.semesters) ? state.semesters : [],
    classes: Array.isArray(state?.classes) ? state.classes : [],
    events: Array.isArray(state?.events) ? state.events : [],
    notes: (Array.isArray(state?.notes) ? state.notes : []).filter(n => n?.kind !== 'canvas'),
    tasks: [],
    kanban: {},
    grades: {},
    settings: state?.settings,
    collab: state?.collab,
    collabRuntime: { teams: {} },
    focusSync: state?.focusSync,
    pomodoros: [],
    taskAlertStates: {},
    courseAvg: { previousAvg: null, numSemesters: 0 },
    holidays: [],
    dismissedNextSemester: {},
  })
}

function saveStateWithLimit(state) {
  const fullJson = JSON.stringify(state)
  const fullBytes = fullJson.length * 2

  if (fullBytes <= LOCAL_CACHE_LIMIT_BYTES) {
    localStorage.setItem(STORAGE_KEY, fullJson)
    return
  }

  const lightweight = buildLightweightSnapshot(state)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight))
}

function startOfWeekLocal(ts, weekStartsOn = 0) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

function getPeriodStart(period) {
  const now = new Date()
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (period === 'week') return startOfWeekLocal(now.getTime(), 0)
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return 0
}

function getPomodoroFocusSecsRaw(pomodoro) {
  if (typeof pomodoro?.focusSecs === 'number' && Number.isFinite(pomodoro.focusSecs)) {
    return Math.max(0, pomodoro.focusSecs)
  }

  const pctRaw = Number.isFinite(pomodoro?.pct)
    ? pomodoro.pct
    : (pomodoro?.abandoned ? 0 : LEGACY_FULL_PCT_UNITS)
  const units = pctRaw <= 1 ? pctRaw * LEGACY_FULL_PCT_UNITS : pctRaw
  const clampedUnits = Math.min(POMODORO_UNITS_MAX, Math.max(0, units))
  return Math.round(clampedUnits * 600)
}

function compactPomodorosForStorage(state) {
  const all = Array.isArray(state?.pomodoros) ? state.pomodoros : []
  if (!all.length) return all

  const period = state?.settings?.pomodoro?.resetPeriod ?? 'week'
  if (period === 'semester') return all

  const start = getPeriodStart(period)
  const active = []
  const aggregate = {
    kind: 'aggregate',
    completedCount: 0,
    abandonedCount: 0,
    focusSecs: 0,
  }

  all.forEach(p => {
    if (isPomodoroAggregate(p)) {
      aggregate.completedCount += Math.max(0, Number(p.completedCount) || 0)
      aggregate.abandonedCount += Math.max(0, Number(p.abandonedCount) || 0)
      aggregate.focusSecs += Math.max(0, Number(p.focusSecs) || 0)
      return
    }

    const ts = getPomodoroTimestamp(p)
    const inActivePeriod = ts > 0 && ts >= start
    if (inActivePeriod) {
      active.push(p)
      return
    }

    if (p?.abandoned) aggregate.abandonedCount += 1
    else aggregate.completedCount += 1
    aggregate.focusSecs += getPomodoroFocusSecsRaw(p)
  })

  if (aggregate.completedCount + aggregate.abandonedCount > 0) {
    return [...active, aggregate]
  }

  return active
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { state, status } = migrateState(JSON.parse(raw))
    if (status === 'invalid') return null
    if (status === 'newer') loadWarnings = ['newer-version']
    return normalizeState(state)
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    const { collabRuntime: _runtime, ...persistableState } = state
    const compacted = {
      ...persistableState,
      pomodoros: compactPomodorosForStorage(persistableState),
    }
    saveStateWithLimit(compacted)
  } catch {
  }
}

export function forceSaveState(state) {
  try {
    const { collabRuntime: _runtime, ...persistableState } = state
    const compacted = {
      ...persistableState,
      pomodoros: compactPomodorosForStorage(persistableState),
    }
    saveStateWithLimit(compacted)
  } catch {
  }
}

export function getAppStorageBytes() {
  try {
    let total = 0
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) ?? '').length * 2
    }
    return total
  } catch {
    return 0
  }
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'organizer-backup.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importState(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        const { state, status } = migrateState(data)
        if (status === 'invalid') throw new Error('Invalid backup file')
        if (status === 'newer') throw new Error('Backup was created by a newer app version')
        resolve(normalizeState(state))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
