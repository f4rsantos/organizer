import { useMemo, useState } from 'react'
import { Star, FileText, Pencil, ChevronRight, ChevronLeft, ChevronUp, X, Folder, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useDndContext, useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { buildFolderTrail, formatFolderNoteCount, sortMosaicItems } from './notesUtils'

function BreadcrumbCrumb({ id, label, isLast, onNavigate, dragging, t }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `__crumb__${id ?? 'root'}`,
    data: { type: 'breadcrumb_drop', folderId: id },
    disabled: isLast,
  })

  if (isLast) {
    return (
      <span className="font-semibold text-foreground truncate px-2 py-1 text-xs">
        {label}
      </span>
    )
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onNavigate(id)}
      className={cn(
        'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors duration-150',
        dragging
          ? (isOver
              ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
              : 'border-dashed border-border/80 bg-muted/60 text-foreground hover:bg-muted')
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      <Folder className="h-3 w-3 text-muted-foreground/70" />
      <span>{label}</span>
    </button>
  )
}

function MoveOutDropZone({ parentId, parentName, t }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `__move_out__${parentId ?? 'root'}`,
    data: { type: 'breadcrumb_drop', folderId: parentId },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-10 w-full rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-medium transition-colors duration-150 select-none shadow-sm',
        isOver
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border/80 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50'
      )}
    >
      <ChevronUp className={cn('h-4 w-4 text-muted-foreground', isOver && 'text-primary')} />
      <span>
        {isOver ? 'Release to move out to ' : 'Drop here to move out to '}
        <strong className={isOver ? 'text-primary font-semibold' : 'text-foreground'}>{parentName}</strong>
      </span>
    </div>
  )
}

function Breadcrumb({ trail, onNavigate, dragging, currentFolderId, t }) {
  if (!trail.length) return null

  const parentFolder = trail.length > 1 ? trail[trail.length - 2] : null
  const parentId = parentFolder ? parentFolder.id : null
  const parentName = parentFolder ? parentFolder.name : (t.notes || 'All Notes')

  return (
    <div className="mb-3 space-y-2 select-none">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <button
          type="button"
          onClick={() => onNavigate(parentId)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mr-1"
          title={`Back to ${parentName}`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="font-medium">{t.notesBack || 'Back'}</span>
        </button>

        <span className="text-muted-foreground/30">|</span>

        <BreadcrumbCrumb id={null} label={t.notes || 'All Notes'} isLast={false} onNavigate={onNavigate} dragging={dragging} t={t} />

        {trail.map((folder, i) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
            <BreadcrumbCrumb
              id={folder.id}
              label={folder.name}
              isLast={i === trail.length - 1}
              onNavigate={onNavigate}
              dragging={dragging}
              t={t}
            />
          </span>
        ))}
      </div>

      {dragging && (
        <MoveOutDropZone parentId={parentId} parentName={parentName} t={t} />
      )}
    </div>
  )
}

function FolderTile({ folder, count, onOpen, onRename, onDelete, dragHover, t }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(folder.name)
  const { active } = useDndContext()

  const isDraggingNote = active?.data?.current?.type === 'note'

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: folder.id,
    data: { type: 'folder', folderId: folder.id, folder },
    disabled: editing,
  })

  const isDropInside = isDraggingNote && dragHover?.folderId === folder.id && dragHover?.action === 'move_inside'

  const style = {
    transform: isDropInside ? undefined : CSS.Transform.toString(transform),
    transition: transition || 'transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    zIndex: isDragging ? 20 : isDropInside ? 10 : undefined,
  }

  const save = () => {
    onRename(folder.id, name.trim() || folder.name)
    setEditing(false)
  }

  const countLabel = formatFolderNoteCount(count, t)

  return (
    <div ref={setNodeRef} style={style}
      className={cn('group relative h-36 rounded-xl transition-all duration-200',
        isDragging && 'opacity-25 border-2 border-dashed border-border')}>

      <div className={cn(
        'absolute -top-3 left-0 h-3.5 w-24 rounded-t-lg border-t border-l border-r z-10 transition-colors',
        'after:absolute after:-bottom-[2px] after:left-0 after:right-0 after:h-[3px] after:z-20 after:content-[""]',
        isDropInside
          ? 'border-primary/60 bg-primary/15 after:bg-primary/15'
          : 'border-border/60 bg-card after:bg-card group-hover:border-border'
      )} />

      <div
        {...attributes} {...listeners}
        onClick={() => !editing && !isDragging && onOpen(folder.id)}
        className={cn(
          'relative flex h-full w-full cursor-pointer flex-col justify-between rounded-xl rounded-tl-none border p-3 text-left transition-colors select-none',
          isDropInside
            ? 'border-primary/60 bg-primary/15 shadow-md ring-2 ring-primary/20'
            : 'border-border/60 bg-card hover:border-border hover:bg-accent/20'
        )}
      >
        <div className="flex items-center">
          <Folder className={cn('h-4 w-4 transition-colors', isDropInside ? 'text-primary' : 'text-muted-foreground/60')} />
        </div>

        <div className="my-auto py-1">
          {editing ? (
            <Input
              value={name}
              autoFocus
              className="h-7 text-sm font-semibold px-1.5"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onChange={e => setName(e.target.value)}
              onBlur={save}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
          ) : (
            <h3 className={cn('font-semibold text-sm md:text-base tracking-tight line-clamp-2 leading-snug transition-colors',
              isDropInside ? 'text-primary' : 'text-foreground')}>
              {folder.name}
            </h3>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground/60">
          <span className="truncate">{countLabel}</span>

          {!editing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 touch:opacity-100 transition-opacity">
              <button
                type="button"
                title={t.notesRenameFolder}
                aria-label={t.notesRenameFolder}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setName(folder.name); setEditing(true) }}
                className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                title={t.notesDeleteFolder}
                aria-label={t.notesDeleteFolder}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onDelete(folder.id) }}
                className="rounded p-1 hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NoteTile({ note, selected, onSelect, onDelete, folderLabel, teamLabel, draggable, t }) {
  const KindIcon = note.kind === 'canvas' ? Pencil : FileText
  const isSharedRemote = Boolean(note.sharedMeta?.remote)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id, data: { type: 'note', note }, disabled: !draggable || isSharedRemote,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    zIndex: isDragging ? 20 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn('group relative h-36 transition-all duration-200',
      isDragging && 'opacity-25 border-2 border-dashed border-border rounded-xl')}>
      <button onClick={() => !isDragging && onSelect(note.id)}
      {...(draggable ? attributes : {})} {...(draggable ? listeners : {})}
      className={cn(
        'flex h-36 w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors',
        selected
          ? 'border-primary/40 bg-primary/10'
          : 'border-border/60 bg-card hover:border-border hover:bg-accent/20',
      )}>
      <span className="flex items-center gap-1.5">
        <KindIcon className="h-3 w-3 shrink-0 text-muted-foreground/50" />
        <span className="flex-1 truncate text-sm font-medium">{note.title || t.notesNew}</span>
        {isSharedRemote && <Users className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
        {note.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
      </span>
      <span className="line-clamp-4 flex-1 overflow-hidden text-xs leading-relaxed text-muted-foreground/70">
        {note.body?.trim()}
      </span>
      <span className="flex items-center gap-1.5 pr-6 text-[10px] text-muted-foreground/50">
        <span className="shrink-0 whitespace-nowrap">
          {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
        </span>
        {teamLabel && <span className="truncate rounded bg-secondary px-1 py-0.5">{teamLabel}</span>}
        {folderLabel && <span className="truncate rounded bg-secondary px-1 py-0.5">{folderLabel}</span>}
      </span>
      </button>
      {!isSharedRemote && (
      <button
        type="button"
        title={t.notesDeleteNote}
        aria-label={t.notesDeleteNote}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete?.(note.id) }}
        className="absolute bottom-3 right-3 z-10 rounded p-1 opacity-0 group-hover:opacity-100 touch:opacity-100 hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-[opacity,background-color,color]"
      >
        <X className="h-3 w-3" />
      </button>
      )}
    </div>
  )
}

export function NoteGrid({
  notes, folders, selectedId, onSelect, onDeleteNote, t,
  currentFolderId = null, onOpenFolder, flat = false, noteCountFor, onRenameFolder, onDeleteFolder,
  dragHover = null, teamNameFor,
}) {
  const { active } = useDndContext()
  const folderName = id => folders.find(f => f.id === id)?.name

  const trail = flat ? [] : buildFolderTrail(folders, currentFolderId)
  const childFolders = flat
    ? []
    : folders.filter(f => (f.parentId ?? null) === currentFolderId)

  const gridItems = useMemo(() => sortMosaicItems(childFolders, notes), [childFolders, notes])
  const isEmpty = !gridItems.length

  return (
    <div>
      {!flat && <Breadcrumb trail={trail} onNavigate={onOpenFolder} dragging={Boolean(active)} currentFolderId={currentFolderId} t={t} />}
      <SortableContext items={gridItems.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className="pt-3.5 grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {gridItems.map(item => (
            item.itemType === 'folder' ? (
              <FolderTile
                key={item.id}
                folder={item}
                count={noteCountFor(item.id)}
                onOpen={onOpenFolder}
                onRename={onRenameFolder}
                onDelete={onDeleteFolder}
                dragHover={dragHover}
                t={t}
              />
            ) : (
              <NoteTile
                key={item.id}
                note={item}
                selected={selectedId === item.id}
                onSelect={onSelect}
                onDelete={onDeleteNote}
                folderLabel={flat ? folderName(item.folderId) : null}
                teamLabel={item.sharedMeta?.teamId ? teamNameFor?.(item.sharedMeta.teamId) : null}
                draggable={!flat}
                t={t}
              />
            )
          ))}
        </div>
      </SortableContext>
      {isEmpty && (
        <p className="px-2 py-8 text-center text-xs italic text-muted-foreground/60">{t.notesFilterEmpty}</p>
      )}
    </div>
  )
}
