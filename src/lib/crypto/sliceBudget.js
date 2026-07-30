import { DATA_SLICES } from './sliceCodec'

export const SHED_ORDER = [
  'pomodoros', 'taskAlertStates', 'notes', 'grades', 'kanban', 'tasks',
]

const IV_BASE64_CHARS = 16
const ENVELOPE_JSON_OVERHEAD = 48
const GCM_TAG_BYTES = 16
const CONTAINER_OVERHEAD = 256
const UTF16_BYTES_PER_CHAR = 2

function base64Length(byteLength) {
  return Math.ceil(byteLength / 3) * 4
}

export function predictSliceChars(value) {
  if (value === undefined) return 0
  const plainBytes = JSON.stringify(value).length
  return base64Length(plainBytes + GCM_TAG_BYTES) + IV_BASE64_CHARS + ENVELOPE_JSON_OVERHEAD
}

export function predictContainerBytes(state, omitted = []) {
  const omit = new Set(omitted)
  let chars = CONTAINER_OVERHEAD + JSON.stringify(state?.version ?? 0).length
  for (const slice of DATA_SLICES) {
    if (omit.has(slice)) continue
    chars += slice.length + predictSliceChars(state?.[slice])
  }
  return chars * UTF16_BYTES_PER_CHAR
}

function dropCanvasNotes(notes) {
  if (!Array.isArray(notes)) return notes
  return notes.filter(note => note?.kind !== 'canvas')
}

export function planWithinBudget(state, limitBytes) {
  if (predictContainerBytes(state) <= limitBytes) {
    return { state, omitted: [] }
  }

  let working = state
  const omitted = []

  for (const slice of SHED_ORDER) {
    if (slice === 'notes') {
      const filtered = dropCanvasNotes(working.notes)
      if (filtered !== working.notes) {
        working = { ...working, notes: filtered }
        if (predictContainerBytes(working, omitted) <= limitBytes) break
      }
      continue
    }

    if (working[slice] === undefined) continue
    omitted.push(slice)
    if (predictContainerBytes(working, omitted) <= limitBytes) break
  }

  return { state: working, omitted }
}
