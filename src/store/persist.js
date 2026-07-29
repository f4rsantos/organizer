import { getPomodoroTimestamp, isPomodoroAggregate } from '../components/focus/pomodoro/utils'
import { migrateState, normalizeState } from './migrations'
import {
  isEnvelope, decryptForSlot, encryptForSlot, aadForLocalSlice, WHOLE_STATE,
  loadKeyString, wasEncryptionEverEnabled,
} from '../lib/crypto'

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

// Measured on plaintext: base64 inflates by ~33% and would trip the cap early.
function selectSnapshot(state) {
  const fullJson = JSON.stringify(state)
  if (fullJson.length * 2 <= LOCAL_CACHE_LIMIT_BYTES) return { value: state, json: fullJson }
  const lightweight = buildLightweightSnapshot(state)
  return { value: lightweight, json: JSON.stringify(lightweight) }
}

function saveStateWithLimit(state) {
  const { json } = selectSnapshot(state)
  localStorage.setItem(STORAGE_KEY, json)
}

const LOCAL_AAD = aadForLocalSlice(WHOLE_STATE)

async function saveStateEncrypted(state, keyString) {
  const { value } = selectSnapshot(state)
  const envelope = await encryptForSlot(value, keyString, LOCAL_AAD)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
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

function addLoadWarning(warning) {
  if (!loadWarnings.includes(warning)) loadWarnings = [...loadWarnings, warning]
}

function finalizeLoadedState(data) {
  const { state, status } = migrateState(data)
  if (status === 'invalid') return null
  if (status === 'newer') addLoadWarning('newer-version')
  return normalizeState(state)
}

function readStoredValue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function loadState() {
  const parsed = readStoredValue()
  if (!parsed || isEnvelope(parsed)) return null
  try {
    return finalizeLoadedState(parsed)
  } catch {
    return null
  }
}

export async function loadStateAsync() {
  const parsed = readStoredValue()
  if (!parsed) return null
  try {
    if (!isEnvelope(parsed)) return finalizeLoadedState(parsed)
    const keyString = loadKeyString()
    if (!keyString) {
      addLoadWarning('encryption-key-required')
      return null
    }
    return finalizeLoadedState(await decryptForSlot(parsed, keyString, LOCAL_AAD))
  } catch {
    addLoadWarning('encryption-key-required')
    return null
  }
}

function compactForStorage(state) {
  const { collabRuntime: _runtime, ...persistableState } = state
  return {
    ...persistableState,
    pomodoros: compactPomodorosForStorage(persistableState),
  }
}

// Writes stay fire-and-forget so store mutations never await the crypto layer.
// A failed encryption must not fall back to a plaintext write.
function persistSnapshot(state) {
  const compacted = compactForStorage(state)
  const keyString = loadKeyString()
  if (!keyString) {
    if (wasEncryptionEverEnabled()) return
    saveStateWithLimit(compacted)
    return
  }
  void saveStateEncrypted(compacted, keyString).catch(() => {})
}

export function saveState(state) {
  try {
    persistSnapshot(state)
  } catch {
  }
}

export function forceSaveState(state) {
  try {
    persistSnapshot(state)
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

export function importState(file, keyString) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        const parsed = JSON.parse(e.target.result)
        let data = parsed
        if (isEnvelope(parsed)) {
          const key = keyString ?? loadKeyString()
          if (!key) throw new Error('encryption-key-required')
          data = await decryptForSlot(parsed, key, LOCAL_AAD)
        }
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
