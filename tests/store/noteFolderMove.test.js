import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

function folder(id, parentId = null) {
  return { id, name: id, parentId, order: 0 }
}

async function freshStore(folders) {
  const { useStore } = await import('../../src/store/useStore.js')
  useStore.setState({ noteFolders: folders, notes: [], hydrated: true })
  return useStore
}

describe('moveNoteFolder', () => {
  let useStore

  beforeEach(async () => {
    useStore = await freshStore([
      folder('root'),
      folder('child', 'root'),
      folder('grandchild', 'child'),
      folder('other'),
    ])
  })

  const parentOf = id => useStore.getState().noteFolders.find(f => f.id === id).parentId

  it('moves a folder under another', () => {
    useStore.getState().moveNoteFolder('other', 'root')
    expect(parentOf('other')).toBe('root')
  })

  it('moves a folder back to the top level', () => {
    useStore.getState().moveNoteFolder('child', null)
    expect(parentOf('child')).toBeNull()
  })

  it('refuses to parent a folder to itself', () => {
    useStore.getState().moveNoteFolder('child', 'child')
    expect(parentOf('child')).toBe('root')
  })

  it('refuses to move a folder into its own descendant', () => {
    useStore.getState().moveNoteFolder('root', 'grandchild')
    expect(parentOf('root')).toBeNull()
    expect(parentOf('grandchild')).toBe('child')
  })
})

describe('addNoteFolder', () => {
  it('creates at the top level by default', async () => {
    const store = await freshStore([])
    store.getState().addNoteFolder('Notes')
    expect(store.getState().noteFolders[0].parentId).toBeNull()
  })

  it('nests under the given parent', async () => {
    const store = await freshStore([folder('root')])
    store.getState().addNoteFolder('Inner', 'root')
    const created = store.getState().noteFolders.find(f => f.name === 'Inner')
    expect(created.parentId).toBe('root')
  })
})

describe('reorderNoteFolders', () => {
  it('updates folder orders matching the given id order', async () => {
    const store = await freshStore([
      { id: 'f1', name: 'Folder 1', parentId: null, order: 0 },
      { id: 'f2', name: 'Folder 2', parentId: null, order: 1 },
      { id: 'f3', name: 'Folder 3', parentId: null, order: 2 },
    ])
    store.getState().reorderNoteFolders(['f3', 'f1', 'f2'])
    const folders = store.getState().noteFolders
    expect(folders.find(f => f.id === 'f3').order).toBe(0)
    expect(folders.find(f => f.id === 'f1').order).toBe(1)
    expect(folders.find(f => f.id === 'f2').order).toBe(2)
  })
})

describe('reorderNotes', () => {
  it('updates note orders matching the given id order', async () => {
    const store = await freshStore([])
    store.setState({
      notes: [
        { id: 'n1', title: 'Note 1', order: 0 },
        { id: 'n2', title: 'Note 2', order: 1 },
      ],
    })
    store.getState().reorderNotes(['n2', 'n1'])
    const notes = store.getState().notes
    expect(notes.find(n => n.id === 'n2').order).toBe(0)
    expect(notes.find(n => n.id === 'n1').order).toBe(1)
  })
})

