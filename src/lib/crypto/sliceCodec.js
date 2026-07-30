import { encryptWithKey, decryptWithKey, isEnvelope } from './envelope'

export const CONTAINER_FORMAT = 'blue-tangerine'
const CONTAINER_FORMATS = [CONTAINER_FORMAT, 'organizer-sliced-1']

export const META_KEYS = ['version', 'theme', 'lang', 'onboardingDone']

export const DATA_SLICES = [
  'activeSemesterId', 'semesters', 'classes', 'tasks', 'events', 'notes', 'noteFolders',
  'kanban', 'grades', 'settings', 'collab', 'focusSync', 'pomodoros', 'taskAlertStates',
  'courseAvg', 'holidays', 'dismissedNextSemester', 'presetUpdatedAt',
]

export const TRANSIENT_KEYS = [
  'activeTab', 'resetSignal', 'collabRuntime', 'hydrated', 'dirtiedBeforeHydrate',
]

export function isContainer(value) {
  return Boolean(value && typeof value === 'object' && CONTAINER_FORMATS.includes(value.format))
}

export function stripTransient(state) {
  const result = {}
  for (const [key, value] of Object.entries(state ?? {})) {
    if (TRANSIENT_KEYS.includes(key)) continue
    result[key] = value
  }
  return result
}

function pickMeta(state) {
  const meta = {}
  for (const key of META_KEYS) {
    if (state?.[key] !== undefined) meta[key] = state[key]
  }
  return meta
}

export function isEncryptedContainer(container) {
  if (!isContainer(container)) return false
  return Object.values(container.slices ?? {}).some(isEnvelope)
}

export async function encodeSlices({
  state, key, aadFor, previousContainer = null, dirtySlices = null, omitted = [], rev = 0,
}) {
  const slices = {}
  const omit = new Set(omitted)
  const dirty = dirtySlices ? new Set(dirtySlices) : null
  const previous = previousContainer?.slices ?? {}

  for (const slice of DATA_SLICES) {
    if (omit.has(slice)) continue

    const value = state?.[slice]
    if (value === undefined) {
      slices[slice] = null
      continue
    }

    const reusable = dirty && !dirty.has(slice) && previous[slice] !== undefined
    if (reusable) {
      slices[slice] = previous[slice]
      continue
    }

    slices[slice] = key
      ? await encryptWithKey(key, value, aadFor(slice))
      : { plain: value }
  }

  return {
    format: CONTAINER_FORMAT,
    meta: pickMeta(state),
    rev,
    slices,
    ...(omit.size ? { omitted: [...omit] } : {}),
  }
}

export async function decodeSlices({ container, key, aadFor }) {
  if (!isContainer(container)) throw new Error('container-invalid')

  const state = { ...container.meta }

  for (const [slice, stored] of Object.entries(container.slices ?? {})) {
    if (stored === null || stored === undefined) continue

    if (isEnvelope(stored)) {
      if (!key) throw new Error('encryption-key-required')
      state[slice] = await decryptWithKey(key, stored, aadFor(slice))
      continue
    }

    if (Object.hasOwn(stored, 'plain')) {
      state[slice] = stored.plain
      continue
    }

    throw new Error('slice-decrypt-failed')
  }

  return state
}
