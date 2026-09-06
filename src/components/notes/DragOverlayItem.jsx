import { Folder, Star, Pencil, FileText } from 'lucide-react'
import { formatFolderNoteCount } from './notesUtils'

export function DragOverlayItem({ item, count, width, height, t }) {
  if (!item) return null
  const isFolder = item.type === 'folder' || 'parentId' in item
  const style = width ? { width: `${width}px`, height: height ? `${height}px` : undefined } : undefined

  if (isFolder) {
    const countLabel = formatFolderNoteCount(count, t)
    return (
      <div style={style} className="relative h-36 rounded-xl rounded-tl-none border border-border/70 bg-card p-3 shadow-2xl pointer-events-none flex flex-col justify-between text-left opacity-95 select-none ring-1 ring-border/30">
        <div className="absolute -top-3 left-0 h-3.5 w-24 rounded-t-lg border-t border-l border-r border-border/70 bg-card z-10 after:absolute after:-bottom-[2px] after:left-0 after:right-0 after:h-[3px] after:bg-card after:z-20 after:content-['']" />
        <div className="flex items-center">
          <Folder className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <div className="my-auto py-1">
          <h3 className="font-semibold text-sm md:text-base text-foreground tracking-tight line-clamp-2 leading-snug">
            {item.name}
          </h3>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground/60">
          <span className="truncate">{countLabel}</span>
        </div>
      </div>
    )
  }

  const KindIcon = item.kind === 'canvas' ? Pencil : FileText
  return (
    <div style={style} className="h-36 rounded-xl border border-border bg-card p-3 shadow-xl pointer-events-none flex flex-col gap-1 text-left opacity-95">
      <span className="flex items-center gap-1.5">
        <KindIcon className="h-3 w-3 shrink-0 text-muted-foreground/50" />
        <span className="flex-1 truncate text-sm font-medium">{item.title || t.notesNew}</span>
        {item.favorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
      </span>
      <span className="line-clamp-4 flex-1 overflow-hidden text-xs leading-relaxed text-muted-foreground/70">
        {item.body?.trim()}
      </span>
    </div>
  )
}
