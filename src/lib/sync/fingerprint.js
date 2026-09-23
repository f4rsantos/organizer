const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const HASH_RADIX = 36

const LIST = { kind: 'list' }
const VALUE = { kind: 'value' }
const mapOf = depth => ({ kind: 'map', depth })

export const SYNC_SHAPES = {
  theme: VALUE,
  lang: VALUE,
  onboardingDone: VALUE,
  activeSemesterId: VALUE,
  courseAvg: VALUE,
  focusSync: VALUE,
  semesters: LIST,
  classes: LIST,
  tasks: LIST,
  events: LIST,
  notes: LIST,
  noteFolders: LIST,
  habits: { kind: 'list', fields: { checkIns: 1 } },
  pomodoros: LIST,
  holidays: LIST,
  grades: mapOf(2),
  kanban: mapOf(1),
  taskAlertStates: mapOf(1),
  dismissedNextSemester: mapOf(1),
  sharedNoteFolders: mapOf(1),
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function hasId(item) {
  return isPlainObject(item) && item.id !== undefined && item.id !== null
}

function isSkippable(value) {
  return value === undefined || typeof value === 'function'
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (typeof value.toJSON === 'function') return stableStringify(value.toJSON())
  if (Array.isArray(value)) {
    return `[${value.map(item => (isSkippable(item) ? 'null' : stableStringify(item))).join(',')}]`
  }
  const keys = Object.keys(value).filter(key => !isSkippable(value[key])).sort()
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

export function hashValue(value) {
  const text = stableStringify(value)
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return (hash >>> 0).toString(HASH_RADIX)
}

function fingerprintNode(value, depth) {
  if (depth <= 0 || !isPlainObject(value)) return hashValue(value)
  const node = {}
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) node[key] = fingerprintNode(child, depth - 1)
  }
  return node
}

export function omitFields(item, fields) {
  const rest = { ...item }
  for (const field of Object.keys(fields)) delete rest[field]
  return rest
}

export function fingerprintItem(shape, item) {
  if (!shape.fields) return hashValue(item)
  const fields = {}
  for (const [field, depth] of Object.entries(shape.fields)) {
    if (item[field] !== undefined) fields[field] = fingerprintNode(item[field], depth)
  }
  return { rest: hashValue(omitFields(item, shape.fields)), fields }
}

function fingerprintList(shape, items) {
  const byId = {}
  for (const item of Array.isArray(items) ? items : []) {
    if (hasId(item)) byId[String(item.id)] = fingerprintItem(shape, item)
  }
  return byId
}

function fingerprintSlice(shape, value) {
  if (shape.kind === 'list') return fingerprintList(shape, value)
  if (shape.kind === 'map') return fingerprintNode(value, shape.depth)
  return hashValue(value)
}

export function fingerprintState(state) {
  const fingerprints = {}
  for (const [key, shape] of Object.entries(SYNC_SHAPES)) {
    const value = state?.[key]
    if (value !== undefined) fingerprints[key] = fingerprintSlice(shape, value)
  }
  return fingerprints
}
