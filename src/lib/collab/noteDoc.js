import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import {
  ySyncPlugin, yCursorPlugin, yUndoPlugin,
  prosemirrorJSONToYDoc, yDocToProsemirrorJSON,
} from 'y-prosemirror'
import {
  toBase64, fromBase64, encryptWithKey, decryptWithKey, isEnvelope,
  importRawKey, aadForNotePresence,
} from '@/lib/crypto'

export const NOTE_FRAGMENT_FIELD = 'default'
export const NOTE_TITLE_FIELD = 'title'
export const NOTE_TITLE_META_FIELD = 'titleMeta'
export const NOTE_FLUSH_INTERVAL_MS = 1500
export const AWARENESS_HEARTBEAT_MS = 3000
export const AWARENESS_STALE_MS = 12000
export const AWARENESS_SWEEP_MS = AWARENESS_STALE_MS * 3
export const AWARENESS_MAX_ENTRIES = 64
export const FIRESTORE_DOC_LIMIT_BYTES = 1048576
export const SHARED_NOTES_BUDGET_BYTES = 700000
export const SHARED_NOTE_WARN_BYTES = 120000

export function createNoteDoc() {
  return new Y.Doc()
}

export function encodeNoteDoc(ydoc) {
  return toBase64(Y.encodeStateAsUpdate(ydoc))
}

export function decodeNoteDoc(stored) {
  const ydoc = new Y.Doc()
  applyStoredUpdate(ydoc, stored)
  return ydoc
}

export function applyStoredUpdate(ydoc, stored, origin = 'remote') {
  if (typeof stored !== 'string' || stored.length === 0) return false
  let update = null
  try {
    update = fromBase64(stored)
  } catch {
    return false
  }
  if (update.byteLength === 0) return false
  try {
    Y.applyUpdate(ydoc, update, origin)
    return true
  } catch {
    return false
  }
}

export function mergeStoredUpdates(a, b) {
  const updates = [a, b]
    .filter(value => typeof value === 'string' && value.length > 0)
    .map(fromBase64)
  if (updates.length === 0) return ''
  return toBase64(Y.mergeUpdates(updates))
}

export function noteDocFragment(ydoc) {
  return ydoc.getXmlFragment(NOTE_FRAGMENT_FIELD)
}

export function isNoteDocEmpty(ydoc) {
  return noteDocFragment(ydoc).length === 0
}

export function noteTitleText(ydoc) {
  return ydoc.getText(NOTE_TITLE_FIELD)
}

export function noteTitleMeta(ydoc) {
  return ydoc.getMap(NOTE_TITLE_META_FIELD)
}

export function hasCollaborativeTitle(ydoc) {
  return noteTitleMeta(ydoc).get('migrated') === true
}

export function adoptCollaborativeTitle(ydoc, storedTitle) {
  if (hasCollaborativeTitle(ydoc)) return false
  ydoc.transact(() => {
    const ytext = noteTitleText(ydoc)
    if (ytext.length === 0 && storedTitle) ytext.insert(0, storedTitle)
    noteTitleMeta(ydoc).set('migrated', true)
  })
  return true
}

export function resolveNoteTitle(ydoc, storedTitle) {
  if (hasCollaborativeTitle(ydoc)) return noteTitleText(ydoc).toString()
  return storedTitle ?? ''
}

export function tiptapJSONToStoredDoc(docJSON, schema) {
  const ydoc = prosemirrorJSONToYDoc(schema, normalizeDocJSON(docJSON, schema), NOTE_FRAGMENT_FIELD)
  const stored = encodeNoteDoc(ydoc)
  ydoc.destroy()
  return stored
}

export function storedDocToTiptapJSON(stored, schema) {
  const ydoc = decodeNoteDoc(stored)
  const json = yDocToProsemirrorJSON(ydoc, NOTE_FRAGMENT_FIELD)
  ydoc.destroy()
  return normalizeDocJSON(json, schema)
}

function normalizeDocJSON(docJSON, schema) {
  const hasContent = Array.isArray(docJSON?.content) && docJSON.content.length > 0
  if (hasContent) return docJSON
  return schema.topNodeType.createAndFill().toJSON()
}

export function plainTextFromDocJSON(docJSON, blockSeparator = '\n') {
  const parts = []
  collectText(docJSON, parts)
  return parts.join(blockSeparator).trim()
}

function collectText(node, parts) {
  if (!node || typeof node !== 'object') return
  if (typeof node.text === 'string') {
    parts.push(node.text)
    return
  }
  for (const child of node.content ?? []) collectText(child, parts)
}

export function storedDocBytes(stored) {
  if (typeof stored !== 'string' || stored.length === 0) return 0
  const padding = stored.endsWith('==') ? 2 : (stored.endsWith('=') ? 1 : 0)
  return Math.max(0, (stored.length / 4) * 3 - padding)
}

export function compactStoredDoc(stored) {
  if (typeof stored !== 'string' || stored.length === 0) return ''
  const ydoc = decodeNoteDoc(stored)
  const compacted = toBase64(Y.encodeStateAsUpdate(ydoc))
  ydoc.destroy()
  return compacted.length < stored.length ? compacted : stored
}

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

export function createNoteDocSession({ stored, onFlush, flushIntervalMs = NOTE_FLUSH_INTERVAL_MS }) {
  const ydoc = decodeNoteDoc(stored)
  let timer = null
  let dirty = false
  let destroyed = false
  let inFlight = false
  let latestGeneration = 0

  const flush = async () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (!dirty || inFlight) return false
    dirty = false
    inFlight = true
    const generation = ++latestGeneration
    try {
      await onFlush(encodeNoteDoc(ydoc))
      return generation === latestGeneration
    } finally {
      inFlight = false
      if (dirty) scheduleFlush()
    }
  }

  const scheduleFlush = () => {
    if (destroyed || timer !== null) return
    timer = setTimeout(() => {
      timer = null
      flush().catch(() => { dirty = true })
    }, flushIntervalMs)
  }

  const handleUpdate = (_update, origin) => {
    if (origin === 'remote') return
    dirty = true
    scheduleFlush()
  }

  ydoc.on('update', handleUpdate)

  return {
    ydoc,
    flush,
    hasPendingChanges: () => dirty,
    receiveRemote: remoteStored => applyStoredUpdate(ydoc, remoteStored, 'remote'),
    destroy: async () => {
      if (destroyed) return
      destroyed = true
      await flush().catch(() => {})
      ydoc.off('update', handleUpdate)
      ydoc.destroy()
    },
  }
}

export function createNoteAwareness(ydoc, localUser) {
  const awareness = new Awareness(ydoc)
  if (localUser) awareness.setLocalStateField('user', localUser)
  return awareness
}

export function encodeAwarenessPresence(awareness) {
  const state = awareness.getLocalState()
  if (!state) return null
  return {
    clientId: awareness.clientID,
    user: state.user ?? null,
    cursor: state.cursor ?? null,
    updatedAt: Date.now(),
  }
}

export function applyAwarenessPresence(awareness, entries, now = Date.now()) {
  const fresh = (entries ?? []).filter(entry => (
    entry
    && entry.clientId !== awareness.clientID
    && now - (entry.updatedAt ?? 0) < AWARENESS_STALE_MS
  ))
  const states = new Map()
  for (const entry of fresh) {
    states.set(entry.clientId, { user: entry.user ?? null, cursor: entry.cursor ?? null })
  }
  const removed = []
  for (const clientId of awareness.getStates().keys()) {
    if (clientId !== awareness.clientID && !states.has(clientId)) removed.push(clientId)
  }
  for (const [clientId, state] of states) awareness.states.set(clientId, state)
  for (const clientId of removed) awareness.states.delete(clientId)
  awareness.emit('change', [{ added: [], updated: [...states.keys()], removed }, 'presence'])
  return { active: states.size, removed: removed.length }
}

export function pruneStalePresence(entries, now = Date.now()) {
  return (entries ?? []).filter(entry => entry && now - (entry.updatedAt ?? 0) < AWARENESS_STALE_MS)
}

export function upsertPresence(entries, presence, now = Date.now()) {
  const others = pruneStalePresence(entries, now).filter(entry => entry.clientId !== presence?.clientId)
  if (!presence) return others
  return [...others, presence]
}

export function presenceEntryKey(sharedNoteId, clientId) {
  return `${sharedNoteId}__${clientId}`
}

export function presenceFieldPath(sharedNoteId, clientId) {
  return `notePresence.${presenceEntryKey(sharedNoteId, clientId)}`
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

export function stalePresenceKeys(presenceMap, now = Date.now(), sweepMs = AWARENESS_SWEEP_MS) {
  return Object.entries(presenceMap ?? {})
    .filter(([, entry]) => now - (entry?.updatedAt ?? 0) > sweepMs)
    .map(([key]) => key)
}

export function overflowPresenceKeys(presenceMap, maxEntries = AWARENESS_MAX_ENTRIES, protectedKey = null) {
  const entries = Object.entries(presenceMap ?? {}).filter(([key]) => key !== protectedKey)
  const excess = entries.length + (protectedKey ? 1 : 0) - maxEntries
  if (excess <= 0) return []
  return entries
    .sort((a, b) => (a[1]?.updatedAt ?? 0) - (b[1]?.updatedAt ?? 0))
    .slice(0, excess)
    .map(([key]) => key)
}

export function presenceKeysToEvict(presenceMap, { now = Date.now(), sweepMs = AWARENESS_SWEEP_MS, maxEntries = AWARENESS_MAX_ENTRIES, protectedKey = null } = {}) {
  const stale = stalePresenceKeys(presenceMap, now, sweepMs).filter(key => key !== protectedKey)
  if (stale.length > 0) return stale
  return overflowPresenceKeys(presenceMap, maxEntries, protectedKey)
}

export function noteCollabExtensionPlugins({ ydoc, awareness, cursorBuilder }) {
  const plugins = [ySyncPlugin(noteDocFragment(ydoc)), yUndoPlugin()]
  if (awareness) {
    plugins.splice(1, 0, yCursorPlugin(awareness, cursorBuilder ? { cursorBuilder } : undefined))
  }
  return plugins
}

export function buildSharedNoteFromLocalNote({ note, schema, sharedNoteId, createdBy, now = Date.now() }) {
  const docJSON = note?.doc ?? schema.topNodeType.createAndFill().toJSON()
  const title = note?.title ?? ''
  const ydoc = prosemirrorJSONToYDoc(schema, normalizeDocJSON(docJSON, schema), NOTE_FRAGMENT_FIELD)
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
