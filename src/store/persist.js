import { getPomodoroTimestamp, isPomodoroAggregate } from '../components/focus/pomodoro/utils'

const STORAGE_KEY = 'f4rsantos.github.io/organizer'
const LEGACY_FULL_PCT_UNITS = 2.5
const POMODORO_UNITS_MAX = 120
const LOCAL_CACHE_LIMIT_BYTES = Math.floor(4.8 * 1024 * 1024)

function getDefaultFocusSettings() {
  return {
    useInterval: true,
    intervalMins: 25,
    intervalBreakMins: 5,
    useScheduled: false,
    scheduledBreakMins: 5,
    scheduledTimes: [],
    focusLabel: '',
    breakLabel: '',
  }
}

function getDefaultPomodoroSettings() {
  return {
    enabled: false,
    resetPeriod: 'week',
    trackStats: false,
    showAbandoned: true,
    showPeriodStats: true,
  }
}

function getDefaultFocusSync() {
  return {
    status: 'paused',
    phase: 'focus',
    startedAt: null,
    totalElapsedBase: 0,
    cycleElapsedBase: 0,
    breakSecsLeftBase: 0,
    activeBreakSource: null,
    updatedAt: 0,
  }
}

function normalizeState(state) {
  if (!state || typeof state !== 'object') return null

  if (!Number.isFinite(state.version)) state.version = 1
  if (typeof state.theme !== 'string') state.theme = 'system'
  if (typeof state.lang !== 'string') state.lang = 'pt'
  if (typeof state.onboardingDone !== 'boolean') state.onboardingDone = false
  if (typeof state.activeSemesterId !== 'string' && state.activeSemesterId !== null) state.activeSemesterId = null

  if (!Array.isArray(state.semesters)) state.semesters = []
  if (!Array.isArray(state.classes)) state.classes = []
  if (!Array.isArray(state.tasks)) state.tasks = []
  if (!state.kanban || typeof state.kanban !== 'object') state.kanban = {}
  if (!state.grades || typeof state.grades !== 'object') state.grades = {}

  if (!state.settings || typeof state.settings !== 'object') state.settings = {}
  if (!state.settings.focus || typeof state.settings.focus !== 'object') {
    state.settings.focus = getDefaultFocusSettings()
  } else {
    state.settings.focus = { ...getDefaultFocusSettings(), ...state.settings.focus }
  }
  if (!state.settings.pomodoro || typeof state.settings.pomodoro !== 'object') {
    state.settings.pomodoro = getDefaultPomodoroSettings()
  } else {
    state.settings.pomodoro = { ...getDefaultPomodoroSettings(), ...state.settings.pomodoro }
  }
  if (typeof state.settings.focusAlertMode !== 'string') {
    state.settings.focusAlertMode = state.settings.vibrateOnPageFocus ? 'vibration' : 'none'
  }
  if (typeof state.settings.taskAlertMode !== 'string') {
    state.settings.taskAlertMode = state.settings.taskAlertsEnabled ? 'in-app' : 'none'
  }
  if (typeof state.settings.collabEnabled !== 'boolean') {
    state.settings.collabEnabled = false
  }

  if (!state.collab || typeof state.collab !== 'object') {
    state.collab = { userId: null, memberships: [] }
  }
  if (!Array.isArray(state.collab.memberships)) state.collab.memberships = []
  if (typeof state.collab.userId !== 'string' && state.collab.userId !== null) state.collab.userId = null

  if (!state.collabRuntime || typeof state.collabRuntime !== 'object') {
    state.collabRuntime = { teams: {} }
  }

  if (!state.focusSync || typeof state.focusSync !== 'object') {
    state.focusSync = getDefaultFocusSync()
  } else {
    state.focusSync = { ...getDefaultFocusSync(), ...state.focusSync }
  }
  if (state.focusSync.status !== 'started' && state.focusSync.status !== 'paused') {
    state.focusSync.status = 'paused'
  }
  if (state.focusSync.phase !== 'break' && state.focusSync.phase !== 'focus') {
    state.focusSync.phase = 'focus'
  }
  if (!Number.isFinite(state.focusSync.totalElapsedBase)) state.focusSync.totalElapsedBase = 0
  if (!Number.isFinite(state.focusSync.cycleElapsedBase)) state.focusSync.cycleElapsedBase = 0
  if (!Number.isFinite(state.focusSync.breakSecsLeftBase)) state.focusSync.breakSecsLeftBase = 0
  if (!Number.isFinite(state.focusSync.startedAt)) state.focusSync.startedAt = null
  if (state.focusSync.activeBreakSource !== 'interval' && state.focusSync.activeBreakSource !== 'scheduled') {
    state.focusSync.activeBreakSource = null
  }

  if (!Array.isArray(state.pomodoros)) state.pomodoros = []
  if (!state.taskAlertStates || typeof state.taskAlertStates !== 'object') state.taskAlertStates = {}
  if (!state.courseAvg || typeof state.courseAvg !== 'object') {
    state.courseAvg = { previousAvg: null, numSemesters: 0 }
  }
  if (!Number.isFinite(state.courseAvg.numSemesters)) state.courseAvg.numSemesters = 0
  if (!Array.isArray(state.holidays)) state.holidays = []
  if (!state.dismissedNextSemester || typeof state.dismissedNextSemester !== 'object') {
    state.dismissedNextSemester = {}
  }

  return state
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
    const state = JSON.parse(raw)
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
        if (!data.version) throw new Error('Invalid backup file')
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
