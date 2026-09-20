import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { Schema } from 'prosemirror-model'
import {
  agentOrigin, isAgentOrigin, agentTrackedOrigins,
  createAgentDocSession, applyAgentUpdateToDoc, replaceNoteDocContent,
  commitAgentNoteReplacement, mergeAgentUpdate, storedDocForAgentContext,
  createAgentAwareness, encodeAgentAwarenessPresence, isAgentPresence,
} from '../../../src/lib/ai/agentDoc.js'
import {
  createNoteDoc, encodeNoteDoc, decodeNoteDoc, noteDocFragment, applyStoredUpdate,
  tiptapJSONToStoredDoc, storedDocToTiptapJSON,
} from '@/lib/notes/yDoc'

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

function docWithParagraph(text) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }
}

function writeParagraph(ydoc, text) {
  const fragment = noteDocFragment(ydoc)
  const paragraph = new Y.XmlElement('paragraph')
  paragraph.insert(0, [new Y.XmlText(text)])
  fragment.insert(fragment.length, [paragraph])
}

describe('agentOrigin', () => {
  it('scopes the origin string to the run id', () => {
    expect(agentOrigin('run_1')).toBe('agent:run_1')
    expect(agentOrigin()).toBe('agent')
  })

  it('isAgentOrigin recognizes any scoped agent origin, not remote or local', () => {
    expect(isAgentOrigin(agentOrigin('run_1'))).toBe(true)
    expect(isAgentOrigin('remote')).toBe(false)
    expect(isAgentOrigin('local')).toBe(false)
    expect(isAgentOrigin(undefined)).toBe(false)
  })

  it('agentTrackedOrigins yields the array shape yUndoPlugin trackedOrigins expects', () => {
    const tracked = agentTrackedOrigins('run_7')
    expect(Array.isArray(tracked)).toBe(true)
    expect(tracked).toEqual(['agent:run_7'])
  })
})

describe('applying an agent update onto an existing note doc', () => {
  it('reflects the change in the resulting stored doc, tagged with the agent origin', () => {
    const base = createNoteDoc()
    writeParagraph(base, 'hello')
    const baseStored = encodeNoteDoc(base)
    base.destroy()

    const agentSide = decodeNoteDoc(baseStored)
    writeParagraph(agentSide, ' world')
    const agentUpdate = encodeNoteDoc(agentSide)
    agentSide.destroy()

    const target = decodeNoteDoc(baseStored)
    let seenOrigin = null
    target.on('update', (_u, origin) => { seenOrigin = origin })

    const applied = applyAgentUpdateToDoc(target, agentUpdate, agentOrigin('run_1'))

    expect(applied).toBe(true)
    expect(seenOrigin).toBe('agent:run_1')
    expect(isAgentOrigin(seenOrigin)).toBe(true)
    expect(noteDocFragment(target).toJSON()).toContain('hello')
    expect(noteDocFragment(target).toJSON()).toContain('world')
    target.destroy()
  })

  it('distinguishes agent origin from a plain remote update', () => {
    const base = createNoteDoc()
    const baseStored = encodeNoteDoc(base)
    base.destroy()

    const remoteSide = decodeNoteDoc(baseStored)
    writeParagraph(remoteSide, 'from elsewhere')
    const remoteUpdate = encodeNoteDoc(remoteSide)
    remoteSide.destroy()

    const agentSide = decodeNoteDoc(baseStored)
    writeParagraph(agentSide, 'from the agent')
    const agentUpdate = encodeNoteDoc(agentSide)
    agentSide.destroy()

    const target = decodeNoteDoc(baseStored)
    const origins = []
    target.on('update', (_u, origin) => origins.push(origin))

    applyStoredUpdate(target, remoteUpdate, 'remote')
    applyAgentUpdateToDoc(target, agentUpdate, agentOrigin('run_1'))

    expect(origins).toContain('remote')
    expect(origins.some(isAgentOrigin)).toBe(true)
    expect(origins[0]).not.toBe(origins[1])
    target.destroy()
  })
})

describe('replaceNoteDocContent', () => {
  it('replaces whole-note content as a single agent-tagged transaction on the same doc identity', () => {
    const stored = tiptapJSONToStoredDoc(docWithParagraph('old content'), schema)
    const ydoc = decodeNoteDoc(stored)

    let seenOrigin = null
    ydoc.on('update', (_u, origin) => { seenOrigin = origin })

    replaceNoteDocContent(ydoc, docWithParagraph('new content'), schema, agentOrigin('run_9'))

    const resultDoc = storedDocToTiptapJSON(encodeNoteDoc(ydoc), schema)
    expect(resultDoc).toEqual(docWithParagraph('new content'))
    expect(seenOrigin).toBe('agent:run_9')
    ydoc.destroy()
  })
})

describe('commitAgentNoteReplacement', () => {
  it('produces a stored doc reflecting the replacement and the scoped origin', () => {
    const baseStored = tiptapJSONToStoredDoc(docWithParagraph('draft'), schema)

    const { stored, origin } = commitAgentNoteReplacement({
      baseStored, docJSON: docWithParagraph('final'), schema, runId: 'run_3',
    })

    expect(origin).toBe('agent:run_3')
    expect(storedDocForAgentContext(stored, schema)).toEqual(docWithParagraph('final'))
  })

  it('works against an empty base doc', () => {
    const { stored } = commitAgentNoteReplacement({
      baseStored: '', docJSON: docWithParagraph('first draft'), schema, runId: 'run_4',
    })
    expect(storedDocForAgentContext(stored, schema)).toEqual(docWithParagraph('first draft'))
  })
})

describe('concurrent human + agent edits merge by CRDT', () => {
  it('both a local user update and an agent update survive when merged against the same base state', () => {
    const base = createNoteDoc()
    writeParagraph(base, 'base')
    const baseStored = encodeNoteDoc(base)
    base.destroy()

    const userSide = decodeNoteDoc(baseStored)
    writeParagraph(userSide, 'user edit')
    const userUpdate = encodeNoteDoc(userSide)
    userSide.destroy()

    const agentSide = decodeNoteDoc(baseStored)
    writeParagraph(agentSide, 'agent edit')
    const agentUpdate = encodeNoteDoc(agentSide)
    agentSide.destroy()

    const merged = mergeAgentUpdate(userUpdate, agentUpdate)
    const mergedDoc = decodeNoteDoc(merged)
    const json = noteDocFragment(mergedDoc).toJSON()

    expect(json).toContain('base')
    expect(json).toContain('user edit')
    expect(json).toContain('agent edit')
    mergedDoc.destroy()
  })

  it('applying local then agent updates onto one live target doc keeps both, with distinct origins', () => {
    const base = createNoteDoc()
    writeParagraph(base, 'shared base')
    const baseStored = encodeNoteDoc(base)
    base.destroy()

    const userSide = decodeNoteDoc(baseStored)
    writeParagraph(userSide, 'typed by human')
    const userUpdate = encodeNoteDoc(userSide)
    userSide.destroy()

    const agentSide = decodeNoteDoc(baseStored)
    writeParagraph(agentSide, 'written by agent')
    const agentUpdate = encodeNoteDoc(agentSide)
    agentSide.destroy()

    const target = decodeNoteDoc(baseStored)
    const origins = []
    target.on('update', (_u, origin) => origins.push(origin))

    applyStoredUpdate(target, userUpdate, 'local')
    applyAgentUpdateToDoc(target, agentUpdate, agentOrigin('run_5'))

    const json = noteDocFragment(target).toJSON()
    expect(json).toContain('shared base')
    expect(json).toContain('typed by human')
    expect(json).toContain('written by agent')
    expect(origins).toEqual(['local', 'agent:run_5'])
    target.destroy()
  })
})

describe('createAgentDocSession', () => {
  it('layers onto an existing note doc identity and flushes agent-origin changes', async () => {
    const baseStored = tiptapJSONToStoredDoc(docWithParagraph('hello'), schema)
    const flushes = []

    const session = createAgentDocSession({
      runId: 'run_2',
      stored: baseStored,
      schema,
      onFlush: async encoded => { flushes.push(encoded) },
      flushIntervalMs: 0,
    })

    session.replaceWithDoc(docWithParagraph('edited by agent'))
    await session.flush()

    expect(flushes.length).toBeGreaterThan(0)
    const finalDoc = storedDocForAgentContext(flushes.at(-1), schema)
    expect(finalDoc).toEqual(docWithParagraph('edited by agent'))

    await session.destroy()
  })

  it('receiveRemote still merges concurrent human edits into the same session doc', async () => {
    const baseStored = tiptapJSONToStoredDoc(docWithParagraph('start'), schema)
    const session = createAgentDocSession({
      runId: 'run_6',
      stored: baseStored,
      schema,
      flushIntervalMs: 0,
    })

    const remoteSide = decodeNoteDoc(baseStored)
    writeParagraph(remoteSide, 'human typed this')
    const remoteUpdate = encodeNoteDoc(remoteSide)
    remoteSide.destroy()

    session.receiveRemote(remoteUpdate)
    session.applyAgentUpdate((() => {
      const agentSide = decodeNoteDoc(baseStored)
      writeParagraph(agentSide, 'agent typed this')
      const update = encodeNoteDoc(agentSide)
      agentSide.destroy()
      return update
    })())

    const json = noteDocFragment(session.ydoc).toJSON()
    expect(json).toContain('start')
    expect(json).toContain('human typed this')
    expect(json).toContain('agent typed this')

    await session.destroy()
  })
})

describe('agent awareness state', () => {
  it('shapes an awareness entry distinguishable from a human collaborator', () => {
    const ydoc = createNoteDoc()
    const awareness = createAgentAwareness(ydoc)
    const presence = encodeAgentAwarenessPresence(awareness)

    expect(presence.user.isAgent).toBe(true)
    expect(presence.user.name).toBe('AI')
    expect(isAgentPresence(presence)).toBe(true)

    const humanAwareness = createNoteDoc()
    const humanPresence = { user: { name: 'Fernando', color: '#000' } }
    expect(isAgentPresence(humanPresence)).toBe(false)

    awareness.destroy()
    ydoc.destroy()
    humanAwareness.destroy()
  })

  it('lets the caller override or extend the agent user shape', () => {
    const ydoc = createNoteDoc()
    const awareness = createAgentAwareness(ydoc, { color: '#8855ff', runId: 'run_1' })
    const presence = encodeAgentAwarenessPresence(awareness)

    expect(presence.user).toEqual({ name: 'AI', isAgent: true, color: '#8855ff', runId: 'run_1' })

    awareness.destroy()
    ydoc.destroy()
  })
})
