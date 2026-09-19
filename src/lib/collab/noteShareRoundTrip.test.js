import { describe, it, expect } from 'vitest'
import { Node as PMNode } from 'prosemirror-model'
import { sharedNoteSchema } from './noteSchema.js'
import {
  buildSharedNoteFromLocalNote, buildLocalNoteFromSharedNote,
  decodeNoteDoc, encodeNoteDoc, applyStoredUpdate, storedDocToTiptapJSON,
  tiptapJSONToStoredDoc, mergeStoredUpdates, noteTitleText, resolveNoteTitle,
  hasCollaborativeTitle, adoptCollaborativeTitle,
} from './noteDoc.js'
import { applyTextDiff } from './yText.js'

const schema = sharedNoteSchema()

const RICH_DOC = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Lecture notes' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'normal, ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }] },
      ],
    },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quoted' }] }] },
  ],
}

const localNote = doc => ({
  id: 'local1', title: 'My note', kind: 'text', body: 'stale', doc,
  strokes: [], favorite: false, archived: false, archivedAt: null,
  folderId: null, order: -1, createdAt: 111, updatedAt: 222,
})

function shareThenSaveLocalCopy(note) {
  const shared = buildSharedNoteFromLocalNote({
    note, schema, sharedNoteId: 'shared1', createdBy: 'person1',
  })
  return { shared, restored: buildLocalNoteFromSharedNote({ sharedNote: shared, schema }) }
}

describe('share deletes the local note, so the round trip must be lossless', () => {
  it('preserves the whole document structure', () => {
    const { restored } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const before = PMNode.fromJSON(schema, RICH_DOC)
    const after = PMNode.fromJSON(schema, restored.doc)
    expect(after.eq(before)).toBe(true)
  })

  it('preserves every text run and its marks', () => {
    const { restored } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const after = PMNode.fromJSON(schema, restored.doc)
    expect(after.textBetween(0, after.content.size, '\n')).toContain('Lecture notes')
    expect(after.textBetween(0, after.content.size, '\n')).toContain('quoted')

    const marked = []
    after.descendants(node => {
      if (node.isText && node.marks.length) marked.push([node.text, node.marks.map(m => m.type.name)])
    })
    expect(marked).toEqual([['bold', ['bold']], ['italic', ['italic']]])
  })

  it('carries the title over and rederives body plaintext', () => {
    const { restored } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    expect(restored.title).toBe('My note')
    expect(restored.kind).toBe('text')
    expect(restored.body).not.toBe('stale')
    expect(restored.body).toContain('Lecture notes')
    expect(restored.body).toContain('second')
  })

  it('survives a note that was never opened in the editor', () => {
    const { restored } = shareThenSaveLocalCopy(localNote(null))
    expect(restored.doc.type).toBe('doc')
    expect(() => PMNode.fromJSON(schema, restored.doc)).not.toThrow()
    expect(restored.body).toBe('')
  })

  it('survives collaborative edits made after sharing', () => {
    const { shared } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const alice = decodeNoteDoc(shared.ydocState)
    const bob = decodeNoteDoc(shared.ydocState)

    alice.getXmlFragment('default').get(1).get(0).insert(0, 'ALICE ')
    bob.getXmlFragment('default').get(3).get(0).get(0).insert(0, 'BOB ')

    const fromAlice = encodeNoteDoc(alice)
    const fromBob = encodeNoteDoc(bob)
    applyStoredUpdate(alice, fromBob)
    applyStoredUpdate(bob, fromAlice)

    expect(alice.getXmlFragment('default').toJSON()).toBe(bob.getXmlFragment('default').toJSON())

    const merged = buildLocalNoteFromSharedNote({
      sharedNote: { ...shared, ydocState: encodeNoteDoc(alice) }, schema,
    })
    expect(merged.body).toContain('ALICE')
    expect(merged.body).toContain('BOB')
    expect(() => PMNode.fromJSON(schema, merged.doc)).not.toThrow()
  })

  it('is stable across repeated share and save cycles', () => {
    let note = localNote(RICH_DOC)
    for (let cycle = 0; cycle < 3; cycle++) {
      const { restored } = shareThenSaveLocalCopy(note)
      note = { ...note, doc: restored.doc, title: restored.title }
    }
    expect(PMNode.fromJSON(schema, note.doc).eq(PMNode.fromJSON(schema, RICH_DOC))).toBe(true)
  })

  it('stores the shared metadata the team needs', () => {
    const { shared } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    expect(shared).toMatchObject({ id: 'shared1', title: 'My note', createdBy: 'person1', updatedBy: 'person1' })
    expect(typeof shared.ydocState).toBe('string')
    expect(shared.ydocState.length).toBeGreaterThan(0)
    expect(shared.createdAt).toBe(111)
  })

  it('keeps note text out of the stored blob only as yjs bytes, still decodable', () => {
    const { shared } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const decoded = storedDocToTiptapJSON(shared.ydocState, schema)
    expect(PMNode.fromJSON(schema, decoded).eq(PMNode.fromJSON(schema, RICH_DOC))).toBe(true)
  })
})

describe('collaborative note titles', () => {
  it('seeds the title fragment when a note is shared', () => {
    const { shared } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const ydoc = decodeNoteDoc(shared.ydocState)
    expect(noteTitleText(ydoc).toString()).toBe('My note')
  })

  it('restores an edited collaborative title into the local copy', () => {
    const { shared } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const ydoc = decodeNoteDoc(shared.ydocState)
    applyTextDiff(noteTitleText(ydoc), 'My renamed note')
    const restored = buildLocalNoteFromSharedNote({
      sharedNote: { ...shared, ydocState: encodeNoteDoc(ydoc) },
      schema,
    })
    expect(restored.title).toBe('My renamed note')
  })

  it('falls back to the flat title for notes shared before the fragment existed', () => {
    const legacy = {
      id: 'shared_legacy',
      title: 'Legacy title',
      ydocState: tiptapJSONToStoredDoc(RICH_DOC, schema),
    }
    const ydoc = decodeNoteDoc(legacy.ydocState)
    expect(hasCollaborativeTitle(ydoc)).toBe(false)
    expect(resolveNoteTitle(ydoc, legacy.title)).toBe('Legacy title')
    expect(buildLocalNoteFromSharedNote({ sharedNote: legacy, schema }).title).toBe('Legacy title')
  })

  it('migrates a legacy title into the fragment on the first edit', () => {
    const legacy = { title: 'Legacy title', ydocState: tiptapJSONToStoredDoc(RICH_DOC, schema) }
    const ydoc = decodeNoteDoc(legacy.ydocState)
    expect(hasCollaborativeTitle(ydoc)).toBe(false)
    adoptCollaborativeTitle(ydoc, legacy.title)
    expect(hasCollaborativeTitle(ydoc)).toBe(true)
    applyTextDiff(noteTitleText(ydoc), 'Legacy title v2')
    expect(resolveNoteTitle(ydoc, legacy.title)).toBe('Legacy title v2')
  })

  it('keeps a deliberately cleared title empty instead of reviving the flat one', () => {
    const { shared } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const ydoc = decodeNoteDoc(shared.ydocState)
    applyTextDiff(noteTitleText(ydoc), '')
    expect(resolveNoteTitle(ydoc, shared.title)).toBe('')
  })

  it('merges concurrent title edits from two members', () => {
    const { shared } = shareThenSaveLocalCopy(localNote(RICH_DOC))
    const alice = decodeNoteDoc(shared.ydocState)
    const bob = decodeNoteDoc(shared.ydocState)

    applyTextDiff(noteTitleText(alice), 'My note (draft)')
    applyTextDiff(noteTitleText(bob), 'Our note')

    const merged = mergeStoredUpdates(encodeNoteDoc(alice), encodeNoteDoc(bob))
    const title = resolveNoteTitle(decodeNoteDoc(merged), shared.title)
    expect(title).toContain('(draft)')
    expect(title).toContain('Our')
  })
})
