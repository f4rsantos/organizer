import { useMemo, useState } from 'react'
import { Plus, Star, Pencil, ChevronDown, ChevronRight, ChevronLeft, FolderPlus, GripVertical, X, Check, Folder } from 'lucide-react'
import { format } from 'date-fns'
import { DndContext, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { loadFirebaseConfig } from '@/lib/firebase'
import { NoteEditor } from './NoteEditor'

const EMPTY = []
const ROOT = '__root__'

function noteOrder(a, b) {
  return (b.favorite - a.favorite) || ((a.order ?? 0) - (b.order ?? 0)) || (b.updatedAt - a.updatedAt)
}
function folderOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
}

function NoteRow({ n, selected, onSelect, t }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: n.id, data: { type: 'note' }, animateLayoutChanges: () => false,
  })
  const style = { transform: CSS.Transform.toString(transform), transition: isDragging ? 'none' : transition }
  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
      <div className={cn('flex w-full items-center gap-1 rounded-lg px-1 py-1.5 text-left text-sm transition-colors',
        selected ? 'bg-primary/10 text-primary' : 'hover:bg-secondary')}>
        <button className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground touch-none shrink-0"
          {...attributes} {...listeners}>
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onSelect(n.id)} className="flex flex-1 min-w-0 flex-col items-stretch">
          <span className="flex w-full items-center gap-1.5">
            {n.favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />}
            <span className="truncate flex-1">{n.title || t.notesNew}</span>
          </span>
          <span className="text-[10px] text-muted-foreground text-center">{t.notesLastEdit} {format(n.updatedAt, 'd MMM, HH:mm')}</span>
        </button>
      </div>
    </li>
  )
}

function FolderNode({ folder, depth, tree, notesByFolder, selectedId, onSelect, onRename, onDelete, t }) {
  const [open, setOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(folder.name)
  const { setNodeRef, isOver } = useDroppable({ id: folder.id, data: { type: 'folder' } })
  const sortable = useSortable({ id: folder.id, data: { type: 'folder' }, animateLayoutChanges: () => false })
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.isDragging ? 'none' : sortable.transition }
  const saveName = () => { onRename(folder.id, name.trim() || folder.name); setEditing(false) }
  const childFolders = (tree[folder.id] ?? []).sort(folderOrder)
  const notes = (notesByFolder[folder.id] ?? []).sort(noteOrder)

  return (
    <div ref={sortable.setNodeRef} style={style} className={cn(sortable.isDragging && 'opacity-40')}>
      <div ref={setNodeRef} className={cn('rounded-lg', isOver && 'ring-2 ring-primary/40 bg-primary/5')}>
        <div className="flex items-center gap-1 px-1 py-1 text-xs font-semibold text-muted-foreground" style={{ paddingLeft: depth * 12 }}>
          <button className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/60 hover:text-foreground"
            {...sortable.attributes} {...sortable.listeners}>
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setOpen(v => !v)} className="shrink-0">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <Folder className="h-3.5 w-3.5 shrink-0" />
          {editing ? (
            <>
              <Input value={name} autoFocus className="h-6 flex-1 text-xs"
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }} />
              <button onClick={saveName} className="hover:text-foreground"><Check className="h-3.5 w-3.5" /></button>
            </>
          ) : (
            <>
              <button onClick={() => setOpen(v => !v)} className="flex-1 truncate text-left"
                onDoubleClick={() => { setName(folder.name); setEditing(true) }}>{folder.name}</button>
              <button onClick={() => { setName(folder.name); setEditing(true) }} title={t.notesRenameFolder}
                className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDelete(folder.id)} title={t.notesDeleteFolder}
                className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
            </>
          )}
        </div>
        {open && (
          <div style={{ paddingLeft: (depth + 1) * 8 }}>
            {childFolders.map(cf => (
              <FolderNode key={cf.id} folder={cf} depth={depth + 1} tree={tree} notesByFolder={notesByFolder}
                selectedId={selectedId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} t={t} />
            ))}
            <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-0.5 min-h-6">
                {notes.map(n => <NoteRow key={n.id} n={n} selected={selectedId === n.id} onSelect={onSelect} t={t} />)}
                {!notes.length && !childFolders.length && <li className="px-2 py-1 text-[10px] text-muted-foreground/60">—</li>}
              </ul>
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  )
}

function RootDropZone({ notes, selectedId, onSelect, t }) {
  const { setNodeRef, isOver } = useDroppable({ id: ROOT, data: { type: 'folder' } })
  return (
    <div ref={setNodeRef} className={cn('rounded-lg', isOver && 'ring-2 ring-primary/40 bg-primary/5')}>
      <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-0.5 min-h-6">
          {notes.map(n => <NoteRow key={n.id} n={n} selected={selectedId === n.id} onSelect={onSelect} t={t} />)}
        </ul>
      </SortableContext>
    </div>
  )
}

export function NotesTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const notes = useStore(s => s.notes ?? EMPTY)
  const folders = useStore(s => s.noteFolders ?? EMPTY)
  const addNote = useStore(s => s.addNote)
  const addNoteFolder = useStore(s => s.addNoteFolder)
  const reorderNotes = useStore(s => s.reorderNotes)
  const moveNoteToFolder = useStore(s => s.moveNoteToFolder)
  const moveNoteFolder = useStore(s => s.moveNoteFolder)
  const renameNoteFolder = useStore(s => s.renameNoteFolder)
  const deleteNoteFolder = useStore(s => s.deleteNoteFolder)
  const firebaseConnected = !!loadFirebaseConfig()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter(n => !q || n.title.toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q))
  }, [notes, query])

  const notesByFolder = useMemo(() => {
    const map = {}
    for (const n of filtered) (map[n.folderId ?? ROOT] ??= []).push(n)
    return map
  }, [filtered])

  const tree = useMemo(() => {
    const map = {}
    for (const f of folders) (map[f.parentId ?? ROOT] ??= []).push(f)
    return map
  }, [folders])

  const selected = notes.find(n => n.id === selectedId) ?? null

  const create = kind => {
    const id = crypto.randomUUID?.() ?? String(Date.now())
    addNote({ id, kind })
    setSelectedId(id)
  }

  const folderIdOf = id => (id === ROOT ? null : id)

  const onDragEnd = ({ active, over }) => {
    if (!over) return
    const type = active.data.current?.type
    const overType = over.data.current?.type
    const targetFolder = overType === 'folder' ? folderIdOf(over.id)
      : (type === 'note' ? (notes.find(n => n.id === over.id)?.folderId ?? null) : null)

    if (type === 'folder') {
      if (over.id === active.id) return
      const parent = overType === 'folder' ? folderIdOf(over.id) : (folders.find(f => f.id === over.id)?.parentId ?? null)
      moveNoteFolder(active.id, parent)
      return
    }
    const sourceFolder = notes.find(n => n.id === active.id)?.folderId ?? null
    if (targetFolder !== sourceFolder) {
      moveNoteToFolder(active.id, targetFolder)
      return
    }
    if (active.id !== over.id) {
      const ids = filtered.filter(n => (n.folderId ?? null) === sourceFolder).sort(noteOrder).map(n => n.id)
      const from = ids.indexOf(active.id)
      const to = ids.indexOf(over.id)
      if (from !== -1 && to !== -1) {
        const next = [...ids]
        next.splice(to, 0, next.splice(from, 1)[0])
        reorderNotes(next)
      }
    }
  }

  const rootFolders = (tree[ROOT] ?? []).sort(folderOrder)
  const rootNotes = (notesByFolder[ROOT] ?? []).sort(noteOrder)

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-5rem)] md:h-screen">
      <aside className={cn('w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-border/50 flex-col',
        selected ? 'hidden md:flex' : 'flex')}>
        <div className="p-3 flex items-center gap-2 shrink-0">
          <Input value={query} placeholder={t.notesSearch} className="h-8" onChange={e => setQuery(e.target.value)} />
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" title={t.notesNewFolder}
            onClick={() => addNoteFolder(t.notesNewFolder)}>
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => create('text')}>
            <Plus className="h-4 w-4" />
          </Button>
          {firebaseConnected && (
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title={t.notesCanvas} onClick={() => create('canvas')}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <RootDropZone notes={rootNotes} selectedId={selectedId} onSelect={setSelectedId} t={t} />
            {rootFolders.map(f => (
              <FolderNode key={f.id} folder={f} depth={0} tree={tree} notesByFolder={notesByFolder}
                selectedId={selectedId} onSelect={setSelectedId} onRename={renameNoteFolder} onDelete={deleteNoteFolder} t={t} />
            ))}
          </DndContext>
          {!filtered.length && !folders.length && <p className="px-2 py-4 text-xs text-muted-foreground text-center">{t.notesEmpty}</p>}
        </div>
      </aside>
      <main className={cn('flex-1 p-4 overflow-y-auto', selected ? 'flex flex-col' : 'hidden md:block')}>
        {selected ? (
          <>
            <Button variant="ghost" size="sm" className="md:hidden self-start mb-2 gap-1 -ml-2"
              onClick={() => setSelectedId(null)}>
              <ChevronLeft className="h-4 w-4" /> {t.notesBack}
            </Button>
            <div className="flex-1 min-h-0">
              <NoteEditor key={selected.id} note={selected} onDeleted={() => setSelectedId(null)} />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{t.notesEmpty}</div>
        )}
      </main>
    </div>
  )
}
