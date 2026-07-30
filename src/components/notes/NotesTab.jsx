import { useMemo, useState } from 'react'
import { Plus, Star, Pencil, ChevronDown, ChevronRight, ChevronLeft, FolderPlus, GripVertical, X, Check, Folder, FolderOpen, Archive, FileText, StickyNote, Search, LayoutGrid, List } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DndContext, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { NoteEditor } from './NoteEditor'
import { NoteGrid } from './NoteGrid'

const EMPTY = []
const ROOT = '__root__'

function noteOrder(a, b) {
  return (b.favorite - a.favorite) || ((a.order ?? 0) - (b.order ?? 0)) || (b.updatedAt - a.updatedAt)
}
function folderOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
}

function noteSnippet(body) {
  if (!body) return ''
  return body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~>]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function NoteRow({ n, selected, onSelect, t }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: n.id, data: { type: 'note' }, animateLayoutChanges: () => false,
  })
  const style = { transform: CSS.Transform.toString(transform), transition: isDragging ? 'none' : transition }
  const snippet = noteSnippet(n.body)
  const KindIcon = n.kind === 'canvas' ? Pencil : FileText
  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
      <div className={cn(
        'group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors cursor-pointer',
        selected
          ? 'bg-primary/15'
          : 'hover:bg-accent/50'
      )}>
        <button className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground touch-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
          {...attributes} {...listeners}>
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onSelect(n.id)} className="flex flex-1 min-w-0 flex-col gap-0.5">
          <span className="flex w-full items-center gap-1.5">
            <KindIcon className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="truncate flex-1 font-medium">{n.title || t.notesNew}</span>
            <Star className={cn(
              'h-3 w-3 shrink-0 transition-colors',
              n.favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
            )} />
          </span>
          <span className="flex w-full items-center gap-1.5 pl-[18px]">
            {snippet && <span className="truncate text-xs text-muted-foreground/70 flex-1">{snippet}</span>}
            <span className="text-[10px] text-muted-foreground/50 shrink-0 whitespace-nowrap">{formatDistanceToNow(n.updatedAt, { addSuffix: true })}</span>
          </span>
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
  const {
    attributes: sortableAttributes,
    listeners: sortableListeners,
    setNodeRef: setSortableNodeRef,
    transform: sortableTransform,
    transition: sortableTransition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: folder.id, data: { type: 'folder' }, animateLayoutChanges: () => false })
  const style = { transform: CSS.Transform.toString(sortableTransform), transition: sortableIsDragging ? 'none' : sortableTransition }
  const saveName = () => { onRename(folder.id, name.trim() || folder.name); setEditing(false) }
  const childFolders = (tree[folder.id] ?? []).sort(folderOrder)
  const notes = (notesByFolder[folder.id] ?? []).sort(noteOrder)
  const FolderIcon = open ? FolderOpen : Folder

  return (
    <div ref={setSortableNodeRef} style={style} className={cn(sortableIsDragging && 'opacity-40')}>
      <div ref={setNodeRef} className={cn('rounded-lg', isOver && 'ring-2 ring-primary/40 bg-primary/5')}>
        <div className="group flex items-center gap-1 px-1 py-1.5 text-xs text-muted-foreground" style={{ paddingLeft: depth * 16 }}>
          <button className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            {...sortableAttributes} {...sortableListeners}>
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setOpen(v => !v)} className="shrink-0 hover:text-foreground transition-colors">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <FolderIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          {editing ? (
            <>
              <Input value={name} autoFocus className="h-6 flex-1 text-xs"
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }} />
              <button onClick={saveName} className="hover:text-foreground"><Check className="h-3.5 w-3.5" /></button>
            </>
          ) : (
            <>
              <button onClick={() => setOpen(v => !v)} className="flex-1 truncate text-left font-medium hover:text-foreground transition-colors"
                onDoubleClick={() => { setName(folder.name); setEditing(true) }}>{folder.name}</button>
              <button onClick={() => { setName(folder.name); setEditing(true) }} title={t.notesRenameFolder}
                className="text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => onDelete(folder.id)} title={t.notesDeleteFolder}
                className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
            </>
          )}
        </div>
        {open && (
          <div className="relative" style={{ paddingLeft: (depth + 1) * 16 }}>
            {(childFolders.length > 0 || notes.length > 0) && (
              <div className="absolute left-0 top-0 bottom-0 border-l border-border/40" style={{ marginLeft: depth * 16 + 20 }} />
            )}
            {childFolders.map(cf => (
              <FolderNode key={cf.id} folder={cf} depth={depth + 1} tree={tree} notesByFolder={notesByFolder}
                selectedId={selectedId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} t={t} />
            ))}
            <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-0.5 min-h-6">
                {notes.map(n => <NoteRow key={n.id} n={n} selected={selectedId === n.id} onSelect={onSelect} t={t} />)}
                {!notes.length && !childFolders.length && <li className="px-2 py-1 text-[10px] text-muted-foreground/40 italic">{t.notesFilterEmpty}</li>}
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
  const updateSettings = useStore(s => s.updateSettings)
  const viewMode = useStore(s => s.settings?.notesViewMode ?? 'list')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter(n => Boolean(n.archived) === showArchived)
      .filter(n => !q || n.title.toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q))
  }, [notes, query, showArchived])

  const archivedCount = useMemo(() => notes.filter(n => n.archived).length, [notes])

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
  const mosaic = viewMode === 'mosaic'
  const mosaicNotes = useMemo(() => filtered.slice().sort(noteOrder), [filtered])

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-5rem)] md:h-screen">
      <aside className={cn('w-full shrink-0 border-b md:border-b-0 md:border-r border-border/50 flex-col',
        mosaic ? 'md:w-auto md:flex-1' : 'md:w-72',
        selected ? (mosaic ? 'hidden' : 'hidden md:flex') : 'flex')}>
        <div className="p-3 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input value={query} placeholder={t.notesSearch} className="h-8 pl-8" onChange={e => setQuery(e.target.value)} />
          </div>
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" title={t.notesNewFolder}
            onClick={() => addNoteFolder(t.notesNewFolder)}>
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => create('text')}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title={t.notesCanvas} onClick={() => create('canvas')}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-3 pb-2 shrink-0 flex items-center gap-2">
          <button onClick={() => setShowArchived(v => !v)}
            className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
              showArchived ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border/60 text-muted-foreground hover:bg-secondary')}>
            <Archive className="h-3.5 w-3.5" />
            {t.notesArchived}
            {archivedCount > 0 && <span className="text-[10px] opacity-70">({archivedCount})</span>}
          </button>
          <button title={viewMode === 'list' ? t.notesViewMosaic : t.notesViewList}
            onClick={() => updateSettings({ notesViewMode: viewMode === 'list' ? 'mosaic' : 'list' })}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary">
            {viewMode === 'list' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {showArchived ? (
            <ul className="space-y-0.5 min-h-6">
              {filtered.slice().sort(noteOrder).map(n => (
                <NoteRow key={n.id} n={n} selected={selectedId === n.id} onSelect={setSelectedId} t={t} />
              ))}
              {!filtered.length && (
                <li className="py-8">
                  <EmptyState icon={Archive} title={t.notesArchivedEmpty} />
                </li>
              )}
            </ul>
          ) : (
            <>
              {mosaic ? (
                <NoteGrid notes={mosaicNotes} folders={folders} selectedId={selectedId} onSelect={setSelectedId} t={t} />
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
                  <RootDropZone notes={rootNotes} selectedId={selectedId} onSelect={setSelectedId} t={t} />
                  {rootFolders.map(f => (
                    <FolderNode key={f.id} folder={f} depth={0} tree={tree} notesByFolder={notesByFolder}
                      selectedId={selectedId} onSelect={setSelectedId} onRename={renameNoteFolder} onDelete={deleteNoteFolder} t={t} />
                  ))}
                </DndContext>
              )}
              {!filtered.length && !folders.length && (
                <div className="py-8">
                  <EmptyState icon={FileText} title={t.notesEmptyTitle} description={t.notesEmptyDesc} />
                </div>
              )}
              {filtered.length === 0 && (folders.length > 0 || query.trim()) && (
                <p className="px-2 py-4 text-xs text-muted-foreground/60 text-center italic">{t.notesFilterEmpty}</p>
              )}
            </>
          )}
        </div>
      </aside>
      <main className={cn('flex-1 p-4 overflow-y-auto', selected ? 'flex flex-col' : mosaic ? 'hidden' : 'hidden md:block')}>
        {selected ? (
          <>
            <Button variant="ghost" size="sm" className={cn('self-start mb-2 gap-1 -ml-2', !mosaic && 'md:hidden')}
              onClick={() => setSelectedId(null)}>
              <ChevronLeft className="h-4 w-4" /> {t.notesBack}
            </Button>
            <div className="flex-1 min-h-0">
              <NoteEditor key={selected.id} note={selected} onDeleted={() => setSelectedId(null)} />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <StickyNote className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/60">{t.notesSelectNote}</p>
          </div>
        )}
      </main>
    </div>
  )
}
