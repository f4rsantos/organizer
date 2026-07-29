import { Star, FileText, Pencil } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export function NoteGrid({ notes, folders, selectedId, onSelect, t }) {
  const folderName = id => folders.find(f => f.id === id)?.name

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
      {notes.map(note => {
        const KindIcon = note.kind === 'canvas' ? Pencil : FileText
        const folder = folderName(note.folderId)
        return (
          <button key={note.id} onClick={() => onSelect(note.id)}
            className={cn(
              'flex h-36 flex-col gap-1 rounded-xl border p-3 text-left transition-colors',
              selectedId === note.id
                ? 'border-primary/40 bg-primary/10'
                : 'border-border/60 bg-card hover:border-border hover:bg-accent/40',
            )}>
            <span className="flex items-center gap-1.5">
              <KindIcon className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              <span className="flex-1 truncate text-sm font-medium">{note.title || t.notesNew}</span>
              {note.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
            </span>
            <span className="line-clamp-4 flex-1 overflow-hidden text-xs leading-relaxed text-muted-foreground/70">
              {note.body?.trim()}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
              {folder && <span className="truncate rounded bg-secondary px-1 py-0.5">{folder}</span>}
              <span className="ml-auto shrink-0 whitespace-nowrap">
                {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
