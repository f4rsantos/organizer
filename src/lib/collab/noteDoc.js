import {
  encryptWithKey, decryptWithKey, isEnvelope,
  importRawKey, aadForNotePresence,
} from '@/lib/crypto'
import {
  NOTE_FRAGMENT_FIELD, NOTE_TITLE_FIELD, NOTE_TITLE_META_FIELD,
  NOTE_FLUSH_INTERVAL_MS, AWARENESS_HEARTBEAT_MS,
  AWARENESS_STALE_MS, AWARENESS_SWEEP_MS, AWARENESS_MAX_ENTRIES,
  createNoteDoc, encodeNoteDoc, decodeNoteDoc, applyStoredUpdate, mergeStoredUpdates,
  noteDocFragment, isNoteDocEmpty,
  noteTitleText, noteTitleMeta, hasCollaborativeTitle, adoptCollaborativeTitle, resolveNoteTitle,
  tiptapJSONToStoredDoc, storedDocToTiptapJSON, plainTextFromDocJSON,
  storedDocBytes, compactStoredDoc,
  createNoteDocSession,
  createNoteAwareness, encodeAwarenessPresence, applyAwarenessPresence, pruneStalePresence,
  upsertPresence, presenceEntryKey, presenceFieldPath, stalePresenceKeys,
  overflowPresenceKeys, presenceKeysToEvict,
  noteCollabExtensionPlugins,
} from '@/lib/notes/yDoc'

export {
  NOTE_FRAGMENT_FIELD, NOTE_TITLE_FIELD, NOTE_TITLE_META_FIELD,
  NOTE_FLUSH_INTERVAL_MS, AWARENESS_HEARTBEAT_MS,
  AWARENESS_STALE_MS, AWARENESS_SWEEP_MS, AWARENESS_MAX_ENTRIES,
  createNoteDoc, encodeNoteDoc, decodeNoteDoc, applyStoredUpdate, mergeStoredUpdates,
  noteDocFragment, isNoteDocEmpty,
  noteTitleText, noteTitleMeta, hasCollaborativeTitle, adoptCollaborativeTitle, resolveNoteTitle,
  tiptapJSONToStoredDoc, storedDocToTiptapJSON, plainTextFromDocJSON,
  storedDocBytes, compactStoredDoc,
  createNoteDocSession,
  createNoteAwareness, encodeAwarenessPresence, applyAwarenessPresence, pruneStalePresence,
  upsertPresence, presenceEntryKey, presenceFieldPath, stalePresenceKeys,
  overflowPresenceKeys, presenceKeysToEvict,
  noteCollabExtensionPlugins,
}

export const FIRESTORE_DOC_LIMIT_BYTES = 1048576
export const SHARED_NOTES_BUDGET_BYTES = 700000
export const SHARED_NOTE_WARN_BYTES = 120000

export function sharedNotesBytes(notes) {
  return (notes ?? []).reduce((total, note) => total + storedDocBytes(note?.ydocState), 0)
}

export function checkSharedNotesBudget(notes, incoming = null, budgetBytes = SHARED_NOTES_BUDGET_BYTES) {
  const others = (notes ?? []).filter(note => note?.id !== incoming?.id)
  const totalBytes = sharedNotesBytes(others) + storedDocBytes(incoming?.ydocState)
  return {
    totalBytes,
    budgetBytes,
    withinBudget: totalBytes <= budgetBytes,
    noteIsLarge: storedDocBytes(incoming?.ydocState) > SHARED_NOTE_WARN_BYTES,
  }
}

export async function sealPresenceRecord({ presence, sharedNoteId, teamId, teamKey }) {
  const { updatedAt, ...secret } = presence
  const payload = { ...secret, sharedNoteId }
  if (!teamKey) return { updatedAt, payload }
  const key = await importRawKey(teamKey)
  return {
    updatedAt,
    payload: await encryptWithKey(key, payload, aadForNotePresence(teamId, sharedNoteId)),
  }
}

export async function openPresenceRecord({ record, sharedNoteId, teamId, teamKey }) {
  const payload = record?.payload
  if (!isEnvelope(payload) || !teamKey) return null
  try {
    const key = await importRawKey(teamKey)
    const opened = await decryptWithKey(key, payload, aadForNotePresence(teamId, sharedNoteId))
    return { ...opened, updatedAt: record.updatedAt ?? 0 }
  } catch {
    return null
  }
}

export async function openPresenceEntriesForNote({ presenceMap, sharedNoteId, teamId, teamKey }) {
  const opened = await Promise.all(
    Object.values(presenceMap ?? {})
      .map(record => openPresenceRecord({ record, sharedNoteId, teamId, teamKey })),
  )
  return opened.filter(Boolean)
}

export function buildSharedNoteFromLocalNote({ note, schema, sharedNoteId, createdBy, now = Date.now() }) {
  const docJSON = note?.doc ?? schema.topNodeType.createAndFill().toJSON()
  const title = note?.title ?? ''
  const ydoc = decodeNoteDoc(tiptapJSONToStoredDoc(docJSON, schema))
  adoptCollaborativeTitle(ydoc, title)
  const ydocState = encodeNoteDoc(ydoc)
  ydoc.destroy()
  return {
    id: sharedNoteId,
    title,
    ydocState,
    createdBy: createdBy ?? null,
    createdAt: note?.createdAt ?? now,
    updatedAt: now,
    updatedBy: createdBy ?? null,
  }
}

export function buildLocalNoteFromSharedNote({ sharedNote, schema, now = Date.now() }) {
  const stored = sharedNote?.ydocState ?? ''
  const doc = storedDocToTiptapJSON(stored, schema)
  const ydoc = decodeNoteDoc(stored)
  const title = resolveNoteTitle(ydoc, sharedNote?.title)
  ydoc.destroy()
  return {
    title,
    kind: 'text',
    doc,
    body: plainTextFromDocJSON(doc),
    strokes: [],
    createdAt: now,
    updatedAt: now,
  }
}
