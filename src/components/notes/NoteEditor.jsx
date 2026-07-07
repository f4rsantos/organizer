import { useState } from 'react'
import { Star, Trash2, Eye, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { NoteCanvas } from './NoteCanvas'
import { Markdown } from './Markdown'

export function NoteEditor({ note, onDeleted }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const updateNote = useStore(s => s.updateNote)
  const deleteNote = useStore(s => s.deleteNote)
  const toggleFavoriteNote = useStore(s => s.toggleFavoriteNote)
  const [preview, setPreview] = useState(true)

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <Input value={note.title} placeholder={t.notesTitle} className="flex-1 font-medium"
          onChange={e => updateNote(note.id, { title: e.target.value })} />
        {note.kind === 'text' && (
          <Button type="button" variant="ghost" size="icon" onClick={() => setPreview(v => !v)} title={preview ? t.notesEdit : t.notesPreview}>
            {preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={() => toggleFavoriteNote(note.id)}>
          <Star className={cn('h-4 w-4', note.favorite && 'fill-amber-400 text-amber-400')} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => { deleteNote(note.id); onDeleted?.() }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {note.kind === 'canvas'
        ? <NoteCanvas note={note} />
        : preview
          ? <div className="flex-1 min-h-64 w-full overflow-y-auto rounded-lg border border-border bg-background p-3">
              {note.body?.trim() ? <Markdown>{note.body}</Markdown> : <span className="text-sm text-muted-foreground">{t.notesBody}</span>}
            </div>
          : <textarea value={note.body} placeholder={t.notesBody}
              className="flex-1 min-h-64 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:ring-1 focus:ring-primary font-mono"
              onChange={e => updateNote(note.id, { body: e.target.value })} />}
    </div>
  )
}
