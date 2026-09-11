import { describe, it, expect, vi } from 'vitest'
import * as Y from 'yjs'
import { Schema, Node as PMNode } from 'prosemirror-model'
import {
  createNoteDoc, encodeNoteDoc, decodeNoteDoc, applyStoredUpdate, mergeStoredUpdates,
  noteDocFragment, isNoteDocEmpty, tiptapJSONToStoredDoc, storedDocToTiptapJSON,
  plainTextFromDocJSON, createNoteDocSession, createNoteAwareness,
  encodeAwarenessPresence, applyAwarenessPresence, pruneStalePresence, upsertPresence,
  AWARENESS_STALE_MS, storedDocBytes, compactStoredDoc, sharedNotesBytes,
  checkSharedNotesBudget, SHARED_NOTES_BUDGET_BYTES,
  presenceEntryKey, presenceFieldPath, stalePresenceKeys,
  overflowPresenceKeys, presenceKeysToEvict, AWARENESS_SWEEP_MS, AWARENESS_MAX_ENTRIES,
  sealPresenceRecord, openPresenceRecord, openPresenceEntriesForNote,
} from './noteDoc.js'
import { createTeamKey } from './teamCrypto.js'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    heading: {
      content: 'inline*',
      group: 'block',
      attrs: { level: { default: 1 } },
      toDOM: node => [`h${node.attrs.level}`, 0],
      parseDOM: [{ tag: 'h1', attrs: { level: 1 } }],
    },
    text: { group: 'inline' },
  },
  marks: {
    bold: { toDOM: () => ['strong', 0], parseDOM: [{ tag: 'strong' }] },
  },
})

function writeParagraph(ydoc, text) {
  const fragment = noteDocFragment(ydoc)
  const paragraph = new Y.XmlElement('paragraph')
  paragraph.insert(0, [new Y.XmlText(text)])
  fragment.insert(fragment.length, [paragraph])
}

describe('encode / decode round trip', () => {
  it('restores the document content', () => {
    const ydoc = createNoteDoc()
    writeParagraph(ydoc, 'hello world')
    const restored = decodeNoteDoc(encodeNoteDoc(ydoc))
    expect(restored.getXmlFragment('default').toJSON()).toBe(ydoc.getXmlFragment('default').toJSON())
  })

  it('produces a base64 string, not readable text', () => {
    const ydoc = createNoteDoc()
    writeParagraph(ydoc, 'topsecret')
    const stored = encodeNoteDoc(ydoc)
    expect(typeof stored).toBe('string')
    expect(stored).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  it('decodes an empty string into an empty doc', () => {
    expect(isNoteDocEmpty(decodeNoteDoc(''))).toBe(true)
  })

  it('ignores malformed stored values instead of throwing', () => {
    const ydoc = createNoteDoc()
    expect(applyStoredUpdate(ydoc, 'not base64 !!!')).toBe(false)
    expect(applyStoredUpdate(ydoc, null)).toBe(false)
    expect(applyStoredUpdate(ydoc, '')).toBe(false)
    expect(isNoteDocEmpty(ydoc)).toBe(true)
  })
})

describe('merge semantics', () => {
  it('applying a remote update is idempotent', () => {
    const remote = createNoteDoc()
    writeParagraph(remote, 'once')
    const stored = encodeNoteDoc(remote)

    const local = decodeNoteDoc(stored)
    applyStoredUpdate(local, stored)
    applyStoredUpdate(local, stored)

    expect(local.getXmlFragment('default').length).toBe(1)
  })

  it('converges when two docs edit independently and exchange updates', () => {
    const base = createNoteDoc()
    writeParagraph(base, 'shared start')
    const seed = encodeNoteDoc(base)

    const alice = decodeNoteDoc(seed)
    const bob = decodeNoteDoc(seed)

    writeParagraph(alice, 'from alice')
    writeParagraph(bob, 'from bob')

    const fromAlice = encodeNoteDoc(alice)
    const fromBob = encodeNoteDoc(bob)

    applyStoredUpdate(alice, fromBob)
    applyStoredUpdate(bob, fromAlice)

    expect(alice.getXmlFragment('default').toJSON()).toBe(bob.getXmlFragment('default').toJSON())
    expect(alice.getXmlFragment('default').length).toBe(3)
  })

  it('converges regardless of the order updates arrive in', () => {
    const seed = encodeNoteDoc(createNoteDoc())
    const a = decodeNoteDoc(seed)
    const b = decodeNoteDoc(seed)
    const c = decodeNoteDoc(seed)
    writeParagraph(a, 'a')
    writeParagraph(b, 'b')
    writeParagraph(c, 'c')

    const first = decodeNoteDoc(seed)
    applyStoredUpdate(first, encodeNoteDoc(a))
    applyStoredUpdate(first, encodeNoteDoc(b))
    applyStoredUpdate(first, encodeNoteDoc(c))

    const second = decodeNoteDoc(seed)
    applyStoredUpdate(second, encodeNoteDoc(c))
    applyStoredUpdate(second, encodeNoteDoc(a))
    applyStoredUpdate(second, encodeNoteDoc(b))

    expect(first.getXmlFragment('default').toJSON()).toBe(second.getXmlFragment('default').toJSON())
  })

  it('merges two stored blobs without a doc', () => {
    const a = createNoteDoc()
    writeParagraph(a, 'alpha')
    const b = createNoteDoc()
    writeParagraph(b, 'beta')

    const merged = decodeNoteDoc(mergeStoredUpdates(encodeNoteDoc(a), encodeNoteDoc(b)))
    expect(merged.getXmlFragment('default').length).toBe(2)
  })

  it('merging with an empty side keeps the other side', () => {
    const a = createNoteDoc()
    writeParagraph(a, 'alpha')
    const stored = encodeNoteDoc(a)
    expect(decodeNoteDoc(mergeStoredUpdates(stored, '')).getXmlFragment('default').length).toBe(1)
    expect(mergeStoredUpdates('', '')).toBe('')
  })
})

describe('tiptap json round trip', () => {
  const docJSON = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'plain and ' },
          { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
        ],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'second line' }] },
    ],
  }

  const asDocument = json => PMNode.fromJSON(schema, json)

  it('preserves content through json -> ydoc -> json', () => {
    const restored = storedDocToTiptapJSON(tiptapJSONToStoredDoc(docJSON, schema), schema)
    expect(asDocument(restored).eq(asDocument(docJSON))).toBe(true)
    expect(plainTextFromDocJSON(restored)).toBe(plainTextFromDocJSON(docJSON))
  })

  it('preserves marks and heading attributes exactly', () => {
    const restored = storedDocToTiptapJSON(tiptapJSONToStoredDoc(docJSON, schema), schema)
    expect(restored.content[0].attrs.level).toBe(1)
    expect(restored.content[1].content[1].marks[0].type).toBe('bold')
    expect(restored.content[1].content[1].text).toBe('bold')
  })

  it('preserves content after a concurrent remote merge', () => {
    const stored = tiptapJSONToStoredDoc(docJSON, schema)
    const ydoc = decodeNoteDoc(stored)
    applyStoredUpdate(ydoc, stored)
    const restored = storedDocToTiptapJSON(encodeNoteDoc(ydoc), schema)
    expect(asDocument(restored).eq(asDocument(docJSON))).toBe(true)
  })

  it('turns a null-ish doc into a valid empty document', () => {
    const stored = tiptapJSONToStoredDoc({ type: 'doc', content: [] }, schema)
    const restored = storedDocToTiptapJSON(stored, schema)
    expect(restored.type).toBe('doc')
    expect(Array.isArray(restored.content)).toBe(true)
  })

  it('derives plain text for search and preview', () => {
    expect(plainTextFromDocJSON(docJSON)).toBe('Title\nplain and \nbold\nsecond line')
    expect(plainTextFromDocJSON(null)).toBe('')
  })
})

describe('flush session', () => {
  it('batches many local edits into a single flush', async () => {
    vi.useFakeTimers()
    const onFlush = vi.fn().mockResolvedValue(undefined)
    const session = createNoteDocSession({ stored: '', onFlush, flushIntervalMs: 1000 })

    writeParagraph(session.ydoc, 'a')
    writeParagraph(session.ydoc, 'b')
    writeParagraph(session.ydoc, 'c')

    expect(onFlush).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(onFlush).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
    await session.destroy()
  })

  it('does not flush for remote updates', async () => {
    vi.useFakeTimers()
    const onFlush = vi.fn().mockResolvedValue(undefined)
    const session = createNoteDocSession({ stored: '', onFlush, flushIntervalMs: 1000 })

    const remote = createNoteDoc()
    writeParagraph(remote, 'remote text')
    session.receiveRemote(encodeNoteDoc(remote))

    await vi.advanceTimersByTimeAsync(1000)
    expect(onFlush).not.toHaveBeenCalled()
    expect(session.ydoc.getXmlFragment('default').length).toBe(1)

    vi.useRealTimers()
    await session.destroy()
  })

  it('flushes pending work on destroy', async () => {
    const onFlush = vi.fn().mockResolvedValue(undefined)
    const session = createNoteDocSession({ stored: '', onFlush, flushIntervalMs: 60000 })
    writeParagraph(session.ydoc, 'unsaved')
    expect(session.hasPendingChanges()).toBe(true)
    await session.destroy()
    expect(onFlush).toHaveBeenCalledTimes(1)
  })

  it('flushes a storable blob that decodes back to the edit', async () => {
    let captured = null
    const session = createNoteDocSession({
      stored: '',
      onFlush: async value => { captured = value },
      flushIntervalMs: 60000,
    })
    writeParagraph(session.ydoc, 'persisted')
    await session.flush()
    expect(decodeNoteDoc(captured).getXmlFragment('default').toJSON()).toContain('persisted')
    await session.destroy()
  })

  it('starts from previously stored content', async () => {
    const seed = createNoteDoc()
    writeParagraph(seed, 'existing')
    const session = createNoteDocSession({ stored: encodeNoteDoc(seed), onFlush: async () => {} })
    expect(session.ydoc.getXmlFragment('default').length).toBe(1)
    await session.destroy()
  })
})

describe('awareness presence', () => {
  const user = { name: 'Alice', color: '#6366f1' }

  it('encodes the local presence entry', () => {
    const ydoc = createNoteDoc()
    const awareness = createNoteAwareness(ydoc, user)
    const presence = encodeAwarenessPresence(awareness)
    expect(presence.user).toEqual(user)
    expect(presence.clientId).toBe(awareness.clientID)
    expect(presence.updatedAt).toBeGreaterThan(0)
  })

  it('applies remote presence and skips its own client', () => {
    const ydoc = createNoteDoc()
    const awareness = createNoteAwareness(ydoc, user)
    const now = Date.now()
    const result = applyAwarenessPresence(awareness, [
      { clientId: awareness.clientID, user, updatedAt: now },
      { clientId: 999, user: { name: 'Bob', color: '#ec4899' }, cursor: { anchor: 1, head: 2 }, updatedAt: now },
    ], now)
    expect(result.active).toBe(1)
    expect(awareness.getStates().get(999).user.name).toBe('Bob')
  })

  it('drops stale presence entries', () => {
    const ydoc = createNoteDoc()
    const awareness = createNoteAwareness(ydoc, user)
    const now = Date.now()
    applyAwarenessPresence(awareness, [{ clientId: 42, user, updatedAt: now }], now)
    expect(awareness.getStates().has(42)).toBe(true)

    applyAwarenessPresence(awareness, [{ clientId: 42, user, updatedAt: now }], now + AWARENESS_STALE_MS + 1)
    expect(awareness.getStates().has(42)).toBe(false)
  })

  it('prunes and upserts the shared presence list', () => {
    const now = Date.now()
    const stale = { clientId: 1, updatedAt: now - AWARENESS_STALE_MS - 1 }
    const live = { clientId: 2, updatedAt: now }
    expect(pruneStalePresence([stale, live], now)).toEqual([live])

    const mine = { clientId: 2, updatedAt: now, user: { name: 'Me' } }
    expect(upsertPresence([stale, live], mine, now)).toEqual([mine])
    expect(upsertPresence([live], null, now)).toEqual([live])
  })
})

describe('team document presence map', () => {
  const entry = (sharedNoteId, clientId, updatedAt) => ({ sharedNoteId, clientId, updatedAt })

  it('builds a dotted field path scoped to note and client', () => {
    expect(presenceEntryKey('note-1', 7)).toBe('note-1__7')
    expect(presenceFieldPath('note-1', 7)).toBe('notePresence.note-1__7')
  })


  it('sweeps only entries well past stale, never merely stale ones', () => {
    const now = Date.now()
    const map = {
      'note-1__1': entry('note-1', 1, now),
      'note-1__2': entry('note-1', 2, now - AWARENESS_STALE_MS - 1),
      'note-1__3': entry('note-1', 3, now - AWARENESS_SWEEP_MS - 1),
    }
    expect(stalePresenceKeys(map, now)).toEqual(['note-1__3'])
    expect(presenceKeysToEvict(map, { now })).toEqual(['note-1__3'])
  })

  it('never evicts the publishing client own entry', () => {
    const now = Date.now()
    const map = { 'note-1__9': entry('note-1', 9, now - AWARENESS_SWEEP_MS - 1) }
    expect(presenceKeysToEvict(map, { now, protectedKey: 'note-1__9' })).toEqual([])
  })

  it('caps the map by dropping the oldest entries beyond the limit', () => {
    const now = Date.now()
    const map = {}
    for (let i = 0; i < AWARENESS_MAX_ENTRIES + 2; i += 1) {
      map[`note-1__${i}`] = entry('note-1', i, now + i)
    }
    const evicted = presenceKeysToEvict(map, { now, protectedKey: 'note-1__999' })
    expect(evicted).toEqual(['note-1__0', 'note-1__1', 'note-1__2'])
    expect(overflowPresenceKeys({}, AWARENESS_MAX_ENTRIES)).toEqual([])
  })

  it('returns nothing to evict for a healthy map', () => {
    const now = Date.now()
    const map = { 'note-1__1': entry('note-1', 1, now) }
    expect(presenceKeysToEvict(map, { now })).toEqual([])
    expect(presenceKeysToEvict(null, { now })).toEqual([])
  })
})

describe('encrypted presence records', () => {
  const presence = {
    clientId: 42,
    user: { name: 'Alice Example', color: '#ff0000' },
    cursor: { anchor: 11, head: 17 },
    updatedAt: 1700000000000,
  }
  const seal = (teamKey, teamId = 'team-1', sharedNoteId = 'note-1') =>
    sealPresenceRecord({ presence, sharedNoteId, teamId, teamKey })

  it('leaves only updatedAt readable and hides every identifying field', async () => {
    const record = await seal(createTeamKey())
    expect(record.updatedAt).toBe(presence.updatedAt)
    expect(Object.keys(record).sort()).toEqual(['payload', 'updatedAt'])
    const serialized = JSON.stringify(record)
    expect(serialized).not.toContain('Alice Example')
    expect(serialized).not.toContain('#ff0000')
    expect(serialized).not.toContain('note-1')
    expect(serialized).not.toContain('"anchor"')
    expect(serialized).not.toContain('42')
  })

  it('round-trips the full presence payload with the right key', async () => {
    const teamKey = createTeamKey()
    const record = await seal(teamKey)
    const opened = await openPresenceRecord({
      record, sharedNoteId: 'note-1', teamId: 'team-1', teamKey,
    })
    expect(opened).toEqual({ ...presence, sharedNoteId: 'note-1' })
  })

  it('skips rather than throws when the key is wrong or missing', async () => {
    const record = await seal(createTeamKey())
    await expect(openPresenceRecord({
      record, sharedNoteId: 'note-1', teamId: 'team-1', teamKey: createTeamKey(),
    })).resolves.toBe(null)
    await expect(openPresenceRecord({
      record, sharedNoteId: 'note-1', teamId: 'team-1', teamKey: null,
    })).resolves.toBe(null)
  })

  it('rejects a record replayed into another team or another note', async () => {
    const teamKey = createTeamKey()
    const record = await seal(teamKey)
    await expect(openPresenceRecord({
      record, sharedNoteId: 'note-1', teamId: 'team-2', teamKey,
    })).resolves.toBe(null)
    await expect(openPresenceRecord({
      record, sharedNoteId: 'note-2', teamId: 'team-1', teamKey,
    })).resolves.toBe(null)
  })

  it('skips legacy plaintext and corrupt records instead of crashing', async () => {
    const teamKey = createTeamKey()
    const legacy = { updatedAt: 1, payload: { clientId: 9, sharedNoteId: 'note-1' } }
    for (const record of [legacy, { updatedAt: 1 }, null, { payload: 'junk' }]) {
      await expect(openPresenceRecord({
        record, sharedNoteId: 'note-1', teamId: 'team-1', teamKey,
      })).resolves.toBe(null)
    }
  })

  it('sweeps an undecryptable legacy entry once it ages out', () => {
    const now = Date.now()
    const map = { 'note-1__9': { updatedAt: now - AWARENESS_SWEEP_MS - 1, payload: { clientId: 9 } } }
    expect(presenceKeysToEvict(map, { now })).toEqual(['note-1__9'])
  })

  it('opens only the entries for the requested note and drops the rest', async () => {
    const teamKey = createTeamKey()
    const presenceMap = {
      'note-1__42': await seal(teamKey),
      'note-2__43': await sealPresenceRecord({
        presence: { ...presence, clientId: 43 }, sharedNoteId: 'note-2', teamId: 'team-1', teamKey,
      }),
      'note-1__44': { updatedAt: 1, payload: { clientId: 44 } },
    }
    const entries = await openPresenceEntriesForNote({
      presenceMap, sharedNoteId: 'note-1', teamId: 'team-1', teamKey,
    })
    expect(entries.map(e => e.clientId)).toEqual([42])
  })

  it('feeds decrypted entries through the stale filter into awareness', async () => {
    const teamKey = createTeamKey()
    const now = Date.now()
    const awareness = createNoteAwareness(createNoteDoc(), { name: 'Me' })
    const presenceMap = {
      'note-1__42': await sealPresenceRecord({
        presence: { ...presence, clientId: 42, updatedAt: now },
        sharedNoteId: 'note-1', teamId: 'team-1', teamKey,
      }),
      'note-1__41': await sealPresenceRecord({
        presence: { ...presence, clientId: 41, updatedAt: now - AWARENESS_STALE_MS - 1 },
        sharedNoteId: 'note-1', teamId: 'team-1', teamKey,
      }),
    }
    const entries = await openPresenceEntriesForNote({
      presenceMap, sharedNoteId: 'note-1', teamId: 'team-1', teamKey,
    })
    applyAwarenessPresence(awareness, entries, now)
    expect(awareness.getStates().has(42)).toBe(true)
    expect(awareness.getStates().has(41)).toBe(false)
  })
})

describe('shared note size budget', () => {
  const docWithText = text => {
    const ydoc = createNoteDoc()
    writeParagraph(ydoc, text)
    return encodeNoteDoc(ydoc)
  }

  it('measures decoded byte length, not base64 length', () => {
    const stored = docWithText('hello')
    expect(storedDocBytes(stored)).toBeLessThan(stored.length)
    expect(storedDocBytes(stored)).toBeGreaterThan(0)
    expect(storedDocBytes('')).toBe(0)
    expect(storedDocBytes(null)).toBe(0)
  })

  it('sums every shared note', () => {
    const notes = [{ ydocState: docWithText('a') }, { ydocState: docWithText('b') }]
    expect(sharedNotesBytes(notes)).toBe(
      storedDocBytes(notes[0].ydocState) + storedDocBytes(notes[1].ydocState),
    )
    expect(sharedNotesBytes(null)).toBe(0)
  })

  it('accepts a normal note', () => {
    const result = checkSharedNotesBudget([], { id: 'n1', ydocState: docWithText('small note') })
    expect(result.withinBudget).toBe(true)
    expect(result.noteIsLarge).toBe(false)
  })

  it('rejects a note that would blow the document budget', () => {
    const huge = { id: 'n1', ydocState: 'A'.repeat(SHARED_NOTES_BUDGET_BYTES * 2) }
    const result = checkSharedNotesBudget([], huge)
    expect(result.withinBudget).toBe(false)
    expect(result.noteIsLarge).toBe(true)
  })

  it('counts existing notes against the budget', () => {
    const existing = [{ id: 'a', ydocState: 'A'.repeat(Math.ceil(SHARED_NOTES_BUDGET_BYTES * 4 / 3)) }]
    expect(checkSharedNotesBudget(existing, { id: 'b', ydocState: docWithText('tiny') }).withinBudget).toBe(false)
  })

  it('replaces rather than double counts a note being updated', () => {
    const stored = 'A'.repeat(Math.ceil(SHARED_NOTES_BUDGET_BYTES * 4 / 3))
    const existing = [{ id: 'a', ydocState: stored }]
    expect(checkSharedNotesBudget(existing, { id: 'a', ydocState: docWithText('now small') }).withinBudget).toBe(true)
  })

  it('compacts a doc with a long edit history without changing its content', () => {
    const ydoc = createNoteDoc()
    for (let i = 0; i < 200; i++) writeParagraph(ydoc, `line ${i}`)
    const fragment = noteDocFragment(ydoc)
    for (let i = 0; i < 150; i++) fragment.delete(0, 1)

    const stored = encodeNoteDoc(ydoc)
    const compacted = compactStoredDoc(stored)
    expect(storedDocBytes(compacted)).toBeLessThanOrEqual(storedDocBytes(stored))
    expect(decodeNoteDoc(compacted).getXmlFragment('default').toJSON())
      .toBe(ydoc.getXmlFragment('default').toJSON())
  })

  it('compacting an empty doc is a no-op', () => {
    expect(compactStoredDoc('')).toBe('')
    expect(compactStoredDoc(null)).toBe('')
  })
})

describe('stale flushes never overwrite newer content', () => {
  it('does not start a second flush while one is in flight', async () => {
    let resolveFlush = null
    const onFlush = vi.fn(() => new Promise(resolve => { resolveFlush = resolve }))
    const session = createNoteDocSession({ stored: '', onFlush, flushIntervalMs: 60000 })

    writeParagraph(session.ydoc, 'first')
    const pending = session.flush()
    expect(onFlush).toHaveBeenCalledTimes(1)

    writeParagraph(session.ydoc, 'second')
    await session.flush()
    expect(onFlush).toHaveBeenCalledTimes(1)

    resolveFlush()
    await pending
  })

  it('reschedules work that arrived while a flush was in flight', async () => {
    vi.useFakeTimers()
    let resolveFlush = null
    const onFlush = vi.fn(() => new Promise(resolve => { resolveFlush = resolve }))
    const session = createNoteDocSession({ stored: '', onFlush, flushIntervalMs: 1000 })

    writeParagraph(session.ydoc, 'first')
    const pending = session.flush()
    writeParagraph(session.ydoc, 'second')

    resolveFlush()
    await pending
    expect(session.hasPendingChanges()).toBe(true)

    await vi.advanceTimersByTimeAsync(1000)
    expect(onFlush).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('the last flush wins and carries the full document', async () => {
    const flushed = []
    const session = createNoteDocSession({
      stored: '',
      onFlush: async value => { flushed.push(value) },
      flushIntervalMs: 60000,
    })

    writeParagraph(session.ydoc, 'one')
    await session.flush()
    writeParagraph(session.ydoc, 'two')
    await session.flush()

    const final = decodeNoteDoc(flushed.at(-1))
    expect(final.getXmlFragment('default').length).toBe(2)
    await session.destroy()
  })
})
