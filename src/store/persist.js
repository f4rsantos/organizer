import { getPomodoroTimestamp, isPomodoroAggregate } from '../components/focus/pomodoro/utils'
import { migrateState, normalizeState } from './migrations'
import {
  isEnvelope, decryptForSlot, aadForLocalSlice, aadForExport, WHOLE_STATE,
  loadKeyString, wasEncryptionEverEnabled, importRawKey, getCachedDek,
  DATA_SLICES, META_KEYS, encodeSlices, decodeSlices, isContainer, stripTransient,
  planWithinBudget,
} from '../lib/crypto'

const STORAGE_KEY = 'f4rsantos.github.io/organizer'
const BACKUP_KEY = `${STORAGE_KEY}:pre-slice-backup`
const LEGACY_FULL_PCT_UNITS = 2.5
const POMODORO_UNITS_MAX = 120
const LOCAL_CACHE_LIMIT_BYTES = Math.floor(4.8 * 1024 * 1024)

let loadWarnings = []
let writesBlocked = null

export function getLoadWarnings() {
  return loadWarnings
}

function blockWrites(reason) {
  writesBlocked = reason
  addLoadWarning(`writes-blocked:${reason}`)
}

export function getWriteBlockReason() {
  return writesBlocked
}

export function readBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function backupOnce(previous) {
  if (previous === null || isContainer(previous)) return
  try {
    if (localStorage.getItem(BACKUP_KEY) !== null) return
    localStorage.setItem(BACKUP_KEY, JSON.stringify(previous))
  } catch {
    return
  }
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

function noteOmitted(container) {
  const omitted = container?.omitted
  if (Array.isArray(omitted) && omitted.length) {
    addLoadWarning(`storage-cap-shed:${omitted.join(',')}`)
  }
}

export function readContainerMeta() {
  const parsed = readStoredValue()
  return isContainer(parsed) ? (parsed.meta ?? null) : null
}

export function hasLocalState() {
  return readStoredValue() !== null
}

export function hasEncryptedSnapshot() {
  const parsed = readStoredValue()
  if (!isContainer(parsed)) return isEnvelope(parsed)
  return Object.values(parsed.slices ?? {}).some(isEnvelope)
}

async function resolveKey() {
  const dek = getCachedDek()
  if (dek) return dek
  const keyString = loadKeyString()
  return keyString ? importRawKey(keyString) : null
}

export function loadState() {
  const parsed = readStoredValue()
  if (!parsed || isEnvelope(parsed)) return null

  try {
    if (!isContainer(parsed)) return finalizeLoadedState(parsed)
    if (Object.values(parsed.slices ?? {}).some(isEnvelope)) return null
    noteOmitted(parsed)
    const loaded = finalizeLoadedState(decodeSlicesSync(parsed))
    if (!loaded) blockWrites('load-failed')
    return loaded
  } catch {
    blockWrites('load-failed')
    return null
  }
}

function decodeSlicesSync(container) {
  const state = { ...container.meta }
  for (const [slice, stored] of Object.entries(container.slices ?? {})) {
    if (stored && Object.hasOwn(stored, 'plain')) state[slice] = stored.plain
  }
  return state
}

export async function loadStateAsync() {
  const parsed = readStoredValue()
  if (!parsed) return null

  try {
    if (isEnvelope(parsed)) {
      const legacyKey = loadKeyString()
      if (!legacyKey) {
        addLoadWarning('encryption-key-required')
        blockWrites('encryption-key-required')
        return null
      }
      return finalizeLoadedState(
        await decryptForSlot(parsed, legacyKey, aadForLocalSlice(WHOLE_STATE)),
      )
    }

    if (!isContainer(parsed)) return finalizeLoadedState(parsed)

    const encrypted = Object.values(parsed.slices ?? {}).some(isEnvelope)
    if (!encrypted) {
      noteOmitted(parsed)
      return finalizeLoadedState(decodeSlicesSync(parsed))
    }

    const key = await resolveKey()
    if (!key) {
      addLoadWarning('encryption-key-required')
      blockWrites('encryption-key-required')
      return null
    }

    let state
    try {
      state = await decodeSlices({ container: parsed, key, aadFor: aadForLocalSlice })
    } catch {
      state = await decodeSlices({ container: parsed, key, aadFor: aadForPersonalSlice })
    }
    noteOmitted(parsed)
    return finalizeLoadedState(state)
  } catch {
    addLoadWarning('encryption-key-required')
    blockWrites('encryption-key-required')
    return null
  }
}

let compactedPomodoros = { source: null, value: null }

function compactForStorage(state) {
  const persistable = stripTransient(state)
  if (persistable.pomodoros !== compactedPomodoros.source) {
    compactedPomodoros = {
      source: persistable.pomodoros,
      value: compactPomodorosForStorage(persistable),
    }
  }
  return { ...persistable, pomodoros: compactedPomodoros.value }
}

let lastPersisted = null
let writeChain = Promise.resolve()
let queued = null

function dirtySlicesOf(state) {
  if (!lastPersisted) return DATA_SLICES
  const omitted = new Set(lastPersisted.omitted)
  return DATA_SLICES.filter(slice => !omitted.has(slice)
    && state[slice] !== lastPersisted.sliceRefs[slice])
}

function metaChanged(state) {
  if (!lastPersisted) return true
  return META_KEYS.some(key => state[key] !== lastPersisted.meta[key])
}

function snapshotRefs(state, keys) {
  const refs = {}
  for (const key of keys) refs[key] = state[key]
  return refs
}

async function writeContainer(state) {
  if (writesBlocked) throw new Error(writesBlocked)

  const key = await resolveKey()
  if (!key && wasEncryptionEverEnabled()) throw new Error('encryption-key-required')

  backupOnce(readStoredValue())

  const { state: planned, omitted } = planWithinBudget(state, LOCAL_CACHE_LIMIT_BYTES)
  const reusable = lastPersisted && lastPersisted.key === key
  const dirty = reusable ? dirtySlicesOf(planned) : null
  const rev = (lastPersisted?.rev ?? 0) + 1

  const container = await encodeSlices({
    state: planned,
    key,
    aadFor: aadForLocalSlice,
    previousContainer: reusable ? lastPersisted.container : null,
    dirtySlices: dirty,
    omitted,
    rev,
  })

  localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
  lastPersisted = {
    sliceRefs: snapshotRefs(planned, DATA_SLICES),
    meta: snapshotRefs(planned, META_KEYS),
    container,
    omitted,
    rev,
    key,
  }
}

function enqueueWrite(state) {
  queued = state
  writeChain = writeChain.then(async () => {
    const pending = queued
    if (!pending) return
    queued = null
    await writeContainer(pending)
  }).catch(() => {})
  return writeChain
}

function persistSnapshot(state, { force = false } = {}) {
  const compacted = compactForStorage(state)
  const unchanged = lastPersisted && !metaChanged(compacted) && !dirtySlicesOf(compacted).length
  if (!force && unchanged) return writeChain
  return enqueueWrite(compacted)
}

export function saveState(state) {
  try {
    void persistSnapshot(state)
  } catch {
    return
  }
}

export function forceSaveState(state) {
  try {
    return persistSnapshot(state, { force: true })
  } catch {
    return Promise.resolve()
  }
}

export function resetPersistCacheForTests() {
  lastPersisted = null
  writeChain = Promise.resolve()
  queued = null
  compactedPomodoros = { source: null, value: null }
  loadWarnings = []
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
          data = await decryptForSlot(parsed, key, aadForExport(WHOLE_STATE))
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
