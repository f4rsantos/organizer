import { isPomodoroAggregate } from '@/components/focus/pomodoro/utils'
import { SYNC_SHAPES, fingerprintItem, hasId, hashValue, isPlainObject, omitFields, stableStringify } from './fingerprint'

function newerOf(local, remote) {
  const localAt = local?.updatedAt
  const remoteAt = remote?.updatedAt
  const localIsNewer = typeof localAt === 'number' && typeof remoteAt === 'number' && localAt > remoteAt
  return localIsNewer ? local : remote
}

function aggregateTotal(aggregate) {
  return (Number(aggregate?.completedCount) || 0) + (Number(aggregate?.abandonedCount) || 0)
}

function preferFullerAggregate(local, remote) {
  if (!isPomodoroAggregate(local) || !isPomodoroAggregate(remote)) return newerOf(local, remote)
  return aggregateTotal(local) > aggregateTotal(remote) ? local : remote
}

const CONFLICT_RESOLVERS = {
  pomodoros: preferFullerAggregate,
}

function resolveEntry({ baseKey, local, remote, keyOf = hashValue, onConflict = newerOf }) {
  if (local === undefined && remote === undefined) return undefined
  if (local === undefined) return keyOf(remote) === baseKey ? undefined : remote
  if (remote === undefined) return keyOf(local) === baseKey ? undefined : local

  const localKey = keyOf(local)
  const remoteKey = keyOf(remote)
  if (localKey === remoteKey) return local
  if (localKey === baseKey) return remote
  if (remoteKey === baseKey) return local
  return onConflict(local, remote)
}

function canNest(value) {
  return value === undefined || isPlainObject(value)
}

function mergeMap(base, local, remote, depth) {
  const baseMap = isPlainObject(base) ? base : {}
  const localMap = isPlainObject(local) ? local : {}
  const remoteMap = isPlainObject(remote) ? remote : {}
  const merged = {}
  for (const key of new Set([...Object.keys(remoteMap), ...Object.keys(localMap)])) {
    const value = mergeNode(baseMap[key], localMap[key], remoteMap[key], depth - 1)
    if (value !== undefined) merged[key] = value
  }
  return merged
}

function mergeNode(base, local, remote, depth) {
  const nested = depth > 0 && typeof base !== 'string' && canNest(local) && canNest(remote)
  if (!nested) return resolveEntry({ baseKey: typeof base === 'string' ? base : undefined, local, remote })

  const merged = mergeMap(base, local, remote, depth)
  const oneSideMissing = local === undefined || remote === undefined
  if (oneSideMissing && !Object.keys(merged).length) return undefined
  return merged
}

function mergeFields(shape, baseNode, local, remote, onConflict) {
  const merged = {
    ...resolveEntry({
      baseKey: baseNode.rest,
      local: omitFields(local, shape.fields),
      remote: omitFields(remote, shape.fields),
      onConflict,
    }),
  }
  for (const [field, depth] of Object.entries(shape.fields)) {
    const value = mergeNode(baseNode.fields?.[field], local[field], remote[field], depth)
    if (value !== undefined) merged[field] = value
  }
  return merged
}

function mergeItem(shape, baseNode, local, remote, onConflict) {
  const bothPresent = local !== undefined && remote !== undefined
  if (shape.fields && bothPresent && isPlainObject(baseNode)) {
    return mergeFields(shape, baseNode, local, remote, onConflict)
  }
  if (!shape.fields) return resolveEntry({ baseKey: baseNode, local, remote, onConflict })
  return resolveEntry({
    baseKey: isPlainObject(baseNode) ? stableStringify(baseNode) : undefined,
    keyOf: item => stableStringify(fingerprintItem(shape, item)),
    local,
    remote,
    onConflict,
  })
}

function mergeList(shape, base, local, remote, onConflict) {
  const baseNodes = isPlainObject(base) ? base : {}
  const localItems = Array.isArray(local) ? local : []
  const remoteItems = Array.isArray(remote) ? remote : []
  const localById = new Map(localItems.filter(hasId).map(item => [String(item.id), item]))
  const remoteIds = new Set()
  const merged = []

  for (const item of remoteItems) {
    if (!hasId(item)) {
      merged.push(item)
      continue
    }
    const id = String(item.id)
    remoteIds.add(id)
    const resolved = mergeItem(shape, baseNodes[id], localById.get(id), item, onConflict)
    if (resolved !== undefined) merged.push(resolved)
  }

  for (const item of localItems) {
    if (!hasId(item) || remoteIds.has(String(item.id))) continue
    const resolved = mergeItem(shape, baseNodes[String(item.id)], item, undefined, onConflict)
    if (resolved !== undefined) merged.push(resolved)
  }

  return merged
}

function mergeSlice(key, shape, base, local, remote) {
  if (shape.kind === 'list') return mergeList(shape, base, local, remote, CONFLICT_RESOLVERS[key] ?? newerOf)
  if (shape.kind === 'map') return mergeNode(base, local, remote, shape.depth)
  return resolveEntry({ baseKey: typeof base === 'string' ? base : undefined, local, remote })
}

export function mergeSyncedState(base, local, remote) {
  const merged = {}
  for (const [key, shape] of Object.entries(SYNC_SHAPES)) {
    const value = mergeSlice(key, shape, base?.[key], local?.[key], remote?.[key])
    if (value !== undefined) merged[key] = value
  }
  return merged
}
