import { useEffect, useMemo, useState, useRef } from 'react'
import { Plus, FolderPlus, Archive, FileText, StickyNote, Search } from 'lucide-react'
import { DndContext, DragOverlay, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useMergedNotes } from '@/hooks/useMergedNotes'
import { useCollabActions } from '@/hooks/useCollabActions'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { NoteEditor } from './NoteEditor'
import { NoteGrid } from './NoteGrid'
import { DragOverlayItem } from './DragOverlayItem'
import {
  EMPTY,
  ROOT,
  noteOrder,
  sortMosaicItems,
  selectMosaicNotes,
  computeReorderTarget,
  reorderArray,
  resolveFolderHoverAction,
} from './notesUtils'

export function NotesTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const notes = useMergedNotes()
  const { getTeamName } = useCollabActions()
  const folders = useStore(s => s.noteFolders ?? EMPTY)
  const addNote = useStore(s => s.addNote)
  const addNoteFolder = useStore(s => s.addNoteFolder)
  const reorderNotes = useStore(s => s.reorderNotes)
  const reorderNoteFolders = useStore(s => s.reorderNoteFolders)
  const moveNoteToFolder = useStore(s => s.moveNoteToFolder)
  const moveNoteFolder = useStore(s => s.moveNoteFolder)
  const renameNoteFolder = useStore(s => s.renameNoteFolder)
  const deleteNoteFolder = useStore(s => s.deleteNoteFolder)
  const deleteNote = useStore(s => s.deleteNote)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [mosaicFolderId, setMosaicFolderId] = useState(null)
  const [activeDrag, setActiveDrag] = useState(null)
  const [dragHover, setDragHover] = useState(null)
  const [navDirection, setNavDirection] = useState(null)
  const hoverTargetRef = useRef(null)
  const lastPointerXRef = useRef(null)
  const dragDirectionRef = useRef(null)
  const folderEntryRef = useRef({})

  const requestedNoteId = useStore(s => s.requestedNoteId)
  const setRequestedNote = useStore(s => s.setRequestedNote)
  useEffect(() => {
    if (!requestedNoteId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(requestedNoteId)
    setRequestedNote(null)
  }, [requestedNoteId, setRequestedNote])

  const setOpenNoteId = useStore(s => s.setOpenNoteId)
  useEffect(() => {
    setOpenNoteId(selectedId)
    return () => setOpenNoteId(null)
  }, [selectedId, setOpenNoteId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter(n => Boolean(n.archived) === showArchived)
      .filter(n => !q || n.title.toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q))
  }, [notes, query, showArchived])

  const archivedCount = useMemo(() => notes.filter(n => n.archived).length, [notes])
  const selected = notes.find(n => n.id === selectedId) ?? null

  const create = kind => {
    const id = crypto.randomUUID?.() ?? String(Date.now())
    const folderId = !query.trim() ? mosaicFolderId : null
    addNote({ id, kind, folderId })
    setNavDirection('next')
    setSelectedId(id)
  }

  const isRemoteNote = id => notes.find(n => n.id === id)?.sharedMeta?.remote === true

  const handleDeleteNote = id => {
    if (isRemoteNote(id)) return
    if (selectedId === id) setSelectedId(null)
    deleteNote(id)
  }

  const deleteMosaicFolder = id => {
    if (mosaicFolderId === id) {
      setMosaicFolderId(folders.find(f => f.id === id)?.parentId ?? null)
    }
    deleteNoteFolder(id)
  }

  const mosaicCollision = args => {
    const { pointerCoordinates, droppableContainers, droppableRects, collisionRect, active } = args
    if (!pointerCoordinates) {
      hoverTargetRef.current = null
      const sortableContainers = droppableContainers.filter(c => !String(c.id).startsWith('__'))
      return closestCenter({ ...args, droppableContainers: sortableContainers })
    }

    const px = pointerCoordinates.x
    const py = pointerCoordinates.y
    const cx = collisionRect ? collisionRect.left + collisionRect.width / 2 : px
    const lastX = lastPointerXRef.current
    if (lastX !== null) {
      const dx = px - lastX
      if (dx < -1) dragDirectionRef.current = 'left'
      else if (dx > 1) dragDirectionRef.current = 'right'
    }
    lastPointerXRef.current = px
    const isNote = active.data?.current?.type === 'note'

    for (const container of droppableContainers) {
      if (container.data?.current?.type === 'breadcrumb_drop') {
        const rect = droppableRects.get(container.id)
        if (rect && px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom) {
          hoverTargetRef.current = null
          return [{ id: container.id, data: container.data }]
        }
      }
    }

    const sortableContainers = droppableContainers.filter(c => !String(c.id).startsWith('__'))
    const closest = closestCenter({ ...args, droppableContainers: sortableContainers })
    if (!closest || !closest.length) {
      hoverTargetRef.current = null
      return []
    }

    const overId = closest[0].id
    if (overId === active.id) {
      hoverTargetRef.current = null
      return closest
    }

    if (isNote) {
      const targetFolder = folders.find(f => f.id === overId)
      if (targetFolder) {
        const rect = droppableRects.get(overId)
        if (rect) {
          const action = resolveFolderHoverAction({
            folderId: overId,
            rect,
            px,
            cx,
            lastX,
            dragDirection: dragDirectionRef.current,
            folderEntryMap: folderEntryRef.current,
          })
          hoverTargetRef.current = { folderId: overId, action }
          return [{
            id: overId,
            data: {
              current: {
                ...(closest[0].data?.current || {}),
                dropAction: action,
                ...(action === 'move_inside' ? { folderId: overId } : {}),
              },
            },
          }]
        }
      }
    }

    for (const key of Object.keys(folderEntryRef.current)) {
      if (key !== overId) delete folderEntryRef.current[key]
    }

    hoverTargetRef.current = null
    return closest
  }

  const onDragStart = ({ active }) => {
    lastPointerXRef.current = null
    dragDirectionRef.current = null
    folderEntryRef.current = {}
    const data = active.data.current ?? {}
    const note = notes.find(n => n.id === active.id)
    const folder = folders.find(f => f.id === active.id)
    const rect = active.rect.current?.initial
    const width = rect?.width ? Math.round(rect.width) : null
    const height = rect?.height ? Math.round(rect.height) : null

    setActiveDrag({
      id: active.id,
      type: data.type || (folder ? 'folder' : 'note'),
      note: data.note || note,
      folder: data.folder || folder,
      width,
      height,
    })
  }

  const onDragMove = () => {
    const target = hoverTargetRef.current
    if (target?.action === 'move_inside') {
      if (dragHover?.folderId !== target.folderId) {
        setDragHover({ folderId: target.folderId, action: 'move_inside' })
      }
    } else {
      if (dragHover) {
        setDragHover(null)
      }
    }
  }

  const onDragOver = ({ over }) => {
    if (!over) {
      if (dragHover) setDragHover(null)
      return
    }
    const target = hoverTargetRef.current
    if (target?.action === 'move_inside') {
      if (dragHover?.folderId !== target.folderId) {
        setDragHover({ folderId: target.folderId, action: 'move_inside' })
      }
    } else {
      if (dragHover) setDragHover(null)
    }
  }

  const onDragCancel = () => {
    setActiveDrag(null)
    setDragHover(null)
    hoverTargetRef.current = null
    lastPointerXRef.current = null
    dragDirectionRef.current = null
    folderEntryRef.current = {}
  }

  const onDragEnd = ({ active, over }) => {
    const target = hoverTargetRef.current
    const currentHover = dragHover
    setActiveDrag(null)
    setDragHover(null)
    hoverTargetRef.current = null
    lastPointerXRef.current = null
    dragDirectionRef.current = null
    folderEntryRef.current = {}

    if (!over || over.id === active.id) return
    const activeType = active.data?.current?.type
    const isRemote = isRemoteNote(active.id)
    const overData = over.data?.current ?? {}
    const overId = String(over.id)

    if (overData.type === 'breadcrumb_drop' || overId.startsWith('__crumb__') || overId.startsWith('__move_out__')) {
      const targetFolderId = overData.folderId ?? null
      if (activeType === 'folder') {
        moveNoteFolder(active.id, targetFolderId)
      } else {
        moveNoteToFolder(active.id, targetFolderId)
      }
      return
    }

    const isTargetFolder = folders.some(f => f.id === over.id)
    const isMoveInside = target?.action === 'move_inside' || currentHover?.action === 'move_inside'

    if (activeType === 'note' && isTargetFolder && isMoveInside) {
      const targetFolderId = target?.folderId ?? currentHover?.folderId ?? over.id
      if (targetFolderId) {
        moveNoteToFolder(active.id, targetFolderId)
      }
      return
    }

    if (isRemote) return

    const currentFolderNotes = mosaicNotes
    const currentChildFolders = folders.filter(f => (f.parentId ?? null) === mosaicFolderId)
    const combined = sortMosaicItems(currentChildFolders, currentFolderNotes)
    const itemIds = combined.map(item => item.id)
    const { from, to } = computeReorderTarget(itemIds, active.id, over.id, target?.action)

    if (from !== -1 && to !== -1 && from !== to) {
      const next = reorderArray(itemIds, from, to)
      reorderNotes(next)
      reorderNoteFolders(next)
    }
  }

  const searching = Boolean(query.trim())
  const currentFolder = useMemo(() => {
    if (!mosaicFolderId) return null
    return folders.find(f => f.id === mosaicFolderId) ? mosaicFolderId : null
  }, [mosaicFolderId, folders])
  const sortedFiltered = useMemo(() => filtered.slice().sort(noteOrder), [filtered])
  const mosaicNotes = selectMosaicNotes(sortedFiltered, searching, currentFolder)
  const noteCountFor = useMemo(() => {
    const counts = new Map()
    for (const n of filtered) {
      const key = n.folderId ?? ROOT
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return id => counts.get(id) ?? 0
  }, [filtered])

  const visibleNotes = useMemo(() => {
    if (searching) return filtered
    return mosaicNotes
  }, [searching, filtered, mosaicNotes])

  const activeNoteList = visibleNotes.length ? visibleNotes : filtered
  const currentIndex = activeNoteList.findIndex(n => n.id === selectedId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < activeNoteList.length - 1
  const prevNote = hasPrev ? activeNoteList[currentIndex - 1] : null
  const nextNote = hasNext ? activeNoteList[currentIndex + 1] : null

  const handlePrev = () => {
    if (!prevNote) return
    setNavDirection('prev')
    setSelectedId(prevNote.id)
  }

  const handleNext = () => {
    if (!nextNote) return
    setNavDirection('next')
    setSelectedId(nextNote.id)
  }

  const handleSelectNote = id => {
    if (id === selectedId) return
    const newIdx = activeNoteList.findIndex(n => n.id === id)
    if (newIdx !== -1 && currentIndex !== -1) {
      setNavDirection(newIdx > currentIndex ? 'next' : 'prev')
    } else {
      setNavDirection(null)
    }
    setSelectedId(id)
  }

  const selectedFolder = selected?.folderId
    ? folders.find(f => f.id === selected.folderId)?.name
    : null

  const dropOverlayConfig = {
    duration: 280,
    easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  }

  const activeItemData = activeDrag?.note || activeDrag?.folder

  return (
    <div className="relative flex flex-col md:flex-row h-tab-pane">
      <aside className={cn('w-full shrink-0 border-b md:border-b-0 md:border-r border-border/50 flex flex-col md:w-auto md:flex-1',
        selected ? 'hidden' : 'flex')}>
        <div className="p-3 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input value={query} placeholder={t.notesSearch} className="h-8 pl-8" onChange={e => setQuery(e.target.value)} />
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" title={t.notesNewFolder}
            onClick={() => addNoteFolder(t.notesNewFolder, !searching ? mosaicFolderId : null)}>
            <FolderPlus className="h-4 w-4" />
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
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-1">
          {showArchived ? (
            <div>
              {filtered.length > 0 ? (
                <NoteGrid notes={filtered.slice().sort(noteOrder)} folders={EMPTY} selectedId={selectedId} onSelect={handleSelectNote} onDeleteNote={handleDeleteNote} t={t} flat={true} teamNameFor={getTeamName} />
              ) : (
                <div className="py-8">
                  <EmptyState icon={Archive} title={t.notesArchivedEmpty} />
                </div>
              )}
            </div>
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={mosaicCollision} onDragStart={onDragStart} onDragMove={onDragMove} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
                <NoteGrid notes={mosaicNotes} folders={folders} selectedId={selectedId} onSelect={handleSelectNote} onDeleteNote={handleDeleteNote} t={t}
                  currentFolderId={mosaicFolderId} onOpenFolder={setMosaicFolderId}
                  flat={searching} noteCountFor={noteCountFor} onRenameFolder={renameNoteFolder}
                  onDeleteFolder={deleteMosaicFolder} dragHover={dragHover} teamNameFor={getTeamName}
                  emptyLabel={searching ? t.notesFilterEmpty : t.notesFolderEmpty} />
                <DragOverlay dropAnimation={dropOverlayConfig}>
                  {activeDrag ? (
                    <DragOverlayItem item={activeItemData} count={noteCountFor(activeDrag.id)} width={activeDrag?.width} height={activeDrag?.height} t={t} />
                  ) : null}
                </DragOverlay>
              </DndContext>
              {!notes.length && !folders.length && (
                <div className="py-8">
                  <EmptyState icon={FileText} title={t.notesEmptyTitle} description={t.notesEmptyDesc} />
                </div>
              )}
            </>
          )}
        </div>
      </aside>
      <main className={cn('flex-1 min-h-0 p-4 overflow-y-auto', selected ? 'flex flex-col' : 'hidden')}>
        {selected ? (
          <div
            key={selected.id}
            className={cn(
              'flex-1 min-h-0 flex flex-col',
              navDirection === 'next' && 'animate-note-next',
              navDirection === 'prev' && 'animate-note-prev',
            )}
          >
            <NoteEditor
              note={selected}
              onDeleted={() => setSelectedId(null)}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
              folderName={selectedFolder}
              onBack={() => setSelectedId(null)}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <StickyNote className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/60">{t.notesSelectNote}</p>
          </div>
        )}
      </main>

      {!selected && (
        <Button size="icon" className="absolute bottom-6 right-6 z-20 h-12 w-12 rounded-full shadow-lg"
          title={t.notesNew} onClick={() => create('text')}>
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
