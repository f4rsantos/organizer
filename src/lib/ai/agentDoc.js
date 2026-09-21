import {
  decodeNoteDoc, encodeNoteDoc, applyStoredUpdate, mergeStoredUpdates,
  createNoteDocSession, tiptapJSONToStoredDoc, storedDocToTiptapJSON,
  noteDocFragment, createNoteAwareness, encodeAwarenessPresence,
} from '@/lib/notes/yDoc'

export const AGENT_ORIGIN_PREFIX = 'agent'

export function agentOrigin(runId) {
  return runId ? `${AGENT_ORIGIN_PREFIX}:${runId}` : AGENT_ORIGIN_PREFIX
}

export function isAgentOrigin(origin) {
  return typeof origin === 'string' && origin.startsWith(AGENT_ORIGIN_PREFIX)
}

export function agentTrackedOrigins(runId) {
  return [agentOrigin(runId)]
}

export function createAgentDocSession({ runId, stored, onFlush, flushIntervalMs, schema }) {
  const session = createNoteDocSession({
    stored,
    onFlush: onFlush ?? (async () => {}),
    ...(flushIntervalMs != null ? { flushIntervalMs } : {}),
  })
  const origin = agentOrigin(runId)

  return {
    ydoc: session.ydoc,
    origin,
    flush: session.flush,
    hasPendingChanges: session.hasPendingChanges,
    receiveRemote: session.receiveRemote,
    applyAgentUpdate: agentStored => applyAgentUpdateToDoc(session.ydoc, agentStored, origin),
    replaceWithDoc: docJSON => replaceNoteDocContent(session.ydoc, docJSON, schema, origin),
    destroy: session.destroy,
  }
}

export function applyAgentUpdateToDoc(ydoc, stored, origin) {
  return applyStoredUpdate(ydoc, stored, origin ?? AGENT_ORIGIN_PREFIX)
}

export function replaceNoteDocContent(ydoc, docJSON, schema, origin = AGENT_ORIGIN_PREFIX) {
  const replacementStored = tiptapJSONToStoredDoc(docJSON, schema)
  const replacementYdoc = decodeNoteDoc(replacementStored)
  const replacementFragment = noteDocFragment(replacementYdoc)
  const replacementNodes = replacementFragment.toArray().map(node => node.clone())

  ydoc.transact(() => {
    const fragment = noteDocFragment(ydoc)
    fragment.delete(0, fragment.length)
    fragment.insert(0, replacementNodes)
  }, origin)

  replacementYdoc.destroy()
}

export function commitAgentNoteReplacement({ baseStored, docJSON, schema, runId }) {
  const ydoc = decodeNoteDoc(baseStored ?? '')
  const origin = agentOrigin(runId)
  replaceNoteDocContent(ydoc, docJSON, schema, origin)
  const stored = encodeNoteDoc(ydoc)
  ydoc.destroy()
  return { stored, origin }
}

export function mergeAgentUpdate(baseStored, agentStored) {
  return mergeStoredUpdates(baseStored, agentStored)
}

export function storedDocForAgentContext(stored, schema) {
  return storedDocToTiptapJSON(stored ?? '', schema)
}

export function createAgentAwareness(ydoc, { name = 'AI', ...rest } = {}) {
  return createNoteAwareness(ydoc, { name, isAgent: true, ...rest })
}

export function encodeAgentAwarenessPresence(awareness) {
  const presence = encodeAwarenessPresence(awareness)
  if (!presence) return null
  return { ...presence, user: { ...presence.user, isAgent: true } }
}

export function isAgentPresence(presence) {
  return Boolean(presence?.user?.isAgent)
}
