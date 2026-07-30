import { lazy, useRef, useState } from 'react'
import { Star, Trash2, Archive, ArchiveRestore, Download, Upload } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { LazyBoundary } from '@/components/common/LazyBoundary'
import { NoteCanvas } from './NoteCanvas'
import { exportNote } from '@/lib/notes/noteExport'
import { markdownToDoc, titleFromMarkdown } from '@/lib/notes/noteImport'

const RichNoteEditor = lazy(() => import('./editor/RichNoteEditor').then(m => ({ default: m.RichNoteEditor })))

const EXPORT_FORMATS = [
  { value: 'md', label: 'Markdown (.md)' },
  { value: 'txt', label: 'Plain text (.txt)' },
  { value: 'html', label: 'Web page (.html)' },
  { value: 'doc', label: 'Word (.doc)' },
  { value: 'pdf', label: 'PDF (print)' },
]

export function NoteEditor({ note, onDeleted }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const updateNote = useStore(s => s.updateNote)
  const deleteNote = useStore(s => s.deleteNote)
  const toggleFavoriteNote = useStore(s => s.toggleFavoriteNote)
  const archiveNote = useStore(s => s.archiveNote)
  const unarchiveNote = useStore(s => s.unarchiveNote)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editorRetry, setEditorRetry] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const importRef = useRef(null)

  const handleDelete = () => {
    deleteNote(note.id)
    onDeleted?.()
  }

  const handleImport = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const source = await file.text()
    updateNote(note.id, {
      doc: markdownToDoc(source),
      body: source,
      title: note.title?.trim() ? note.title : titleFromMarkdown(source, file.name.replace(/\.[^.]+$/, '')),
    })
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="space-y-1">
        <input
          value={note.title}
          placeholder={t.notesTitle}
          className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/40"
          onChange={e => updateNote(note.id, { title: e.target.value })}
        />
        <p className="text-[11px] text-muted-foreground/50">
          {t.notesLastEdit} {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 flex-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavoriteNote(note.id)}>
            <Star className={cn('h-3.5 w-3.5', note.favorite && 'fill-amber-400 text-amber-400')} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
            title={note.archived ? t.notesUnarchive : t.notesArchive}
            onClick={() => note.archived ? unarchiveNote(note.id) : archiveNote(note.id)}>
            {note.archived ? <ArchiveRestore className="h-3.5 w-3.5 text-primary" /> : <Archive className="h-3.5 w-3.5" />}
          </Button>

          {note.kind !== 'canvas' && (
            <>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t.notesImport}
                onClick={() => importRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
              </Button>
              <div className="relative">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t.notesExport}
                  onClick={() => setExportOpen(v => !v)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {exportOpen && (
                  <div className="absolute left-0 top-8 z-20 w-44 rounded-lg border border-border bg-popover p-1 shadow-md">
                    {EXPORT_FORMATS.map(format => (
                      <button key={format.value} type="button"
                        className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                        onClick={() => { exportNote(note, format.value); setExportOpen(false) }}>
                        {format.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive transition-colors" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator />

      <div className="flex-1 min-h-0">
        {note.kind === 'canvas'
          ? <NoteCanvas note={note} />
          : (
            <LazyBoundary
              retryKey={editorRetry}
              onRetry={() => setEditorRetry(n => n + 1)}
              errorLabel={t.chunkLoadError}
              retryLabel={t.chunkRetry}
            >
              <RichNoteEditor note={note} />
            </LazyBoundary>
          )}
      </div>

      <input ref={importRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="sr-only" tabIndex={-1} onChange={handleImport} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t.notesDeleteConfirmTitle}
        description={t.notesDeleteConfirmDesc}
        onConfirm={handleDelete}
      />
    </div>
  )
}
