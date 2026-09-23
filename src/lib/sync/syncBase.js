import { DATA_SLICES, META_KEYS } from '@/lib/crypto/sliceCodec'
import { fingerprintState, stableStringify } from './fingerprint'

const SYNCED_KEYS = [...META_KEYS, ...DATA_SLICES]

export function toSyncedView(state) {
  const notes = (state?.notes ?? []).filter(note => !note?.offlineOnly)
  return { ...state, notes }
}

export function createSyncBase(scope, state) {
  return { scope, slices: fingerprintState(toSyncedView(state)) }
}

export function syncBaseFor(syncBase, scope) {
  if (!scope || syncBase?.scope !== scope) return null
  return syncBase.slices ?? null
}

export function hasUnsyncedChanges(syncBase, scope, state) {
  const base = syncBaseFor(syncBase, scope)
  if (!base) return true
  return stableStringify(fingerprintState(toSyncedView(state))) !== stableStringify(base)
}

export function syncedContentChanged(state, previous) {
  return SYNCED_KEYS.some(key => state?.[key] !== previous?.[key])
}
