import { lazy, useEffect, useRef, useState } from 'react'
import { Star, Trash2, Archive, ArchiveRestore, Download, Upload, FileText, PenLine, ChevronLeft, Folder, Share2, Users, CopyPlus, CloudOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ShareToTeamDialog } from '@/components/collab/ShareToTeamDialog'
import { useCollabActions } from '@/hooks/useCollabActions'
import { useSharedNoteSession } from '@/hooks/useSharedNoteSession'
import { useSharedNoteTitle } from '@/hooks/useSharedNoteTitle'
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

function LocalNoteActions({ note, t, canShare, onChangeKind, onToggleFavorite, onToggleArchive, onToggleOfflineOnly, onShare }) {
  return (
    <>
      <div className="relative mr-1 grid grid-cols-2 rounded-full bg-muted/60 p-0.5">
        <div className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-background shadow-sm transition-[left] duration-200 ease-out"
          style={{ left: note.kind === 'canvas' ? 'calc(50% + 1px)' : '2px' }} />
        {[['text', FileText, t.notesText], ['canvas', PenLine, t.notesCanvas]].map(([kind, Icon, label]) => (
          <button key={kind} type="button" title={label}
            onClick={() => note.kind !== kind && onChangeKind(kind)}
            className={cn('relative z-10 flex items-center justify-center rounded-full px-2.5 py-1 transition-colors',
              note.kind === kind ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleFavorite}>
        <Star className={cn('h-3.5 w-3.5', note.favorite && 'fill-amber-400 text-amber-400')} />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
        title={note.archived ? t.notesUnarchive : t.notesArchive}
        onClick={onToggleArchive}>
        {note.archived ? <ArchiveRestore className="h-3.5 w-3.5 text-primary" /> : <Archive className="h-3.5 w-3.5" />}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
        title={note.offlineOnly ? t.notesOfflineOnlyOn : t.notesOfflineOnlyOff}
        onClick={onToggleOfflineOnly}>
        <CloudOff className={cn('h-3.5 w-3.5', note.offlineOnly && 'text-primary')} />
      </Button>
      {canShare && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={t.collabShareNote} onClick={onShare}>
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </>
  )
}

export function NoteEditor({
  note, onDeleted, onPrev, onNext, hasPrev = false, hasNext = false,
  folderName = null, onBack = null,
}) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const updateNote = useStore(s => s.updateNote)
  const deleteNote = useStore(s => s.deleteNote)
  const toggleFavoriteNote = useStore(s => s.toggleFavoriteNote)
  const toggleOfflineOnlyNote = useStore(s => s.toggleOfflineOnlyNote)
  const archiveNote = useStore(s => s.archiveNote)
  const unarchiveNote = useStore(s => s.unarchiveNote)
  const shareNoteToTeam = useStore(s => s.shareNoteToTeam)
  const saveLocalCopyOfSharedNote = useStore(s => s.saveLocalCopyOfSharedNote)
  const { teams, getTeamName } = useCollabActions()
  const sharedMeta = note.sharedMeta?.remote ? note.sharedMeta : null
  const teamName = sharedMeta ? getTeamName(sharedMeta.teamId) : null
  const collab = useSharedNoteSession(sharedMeta)
  const sharedTitle = useSharedNoteTitle(collab?.titleSource ?? null, note.title)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareTeamId, setShareTeamId] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editorRetry, setEditorRetry] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const importRef = useRef(null)
  const touchStartRef = useRef(null)

  useEffect(() => {
    const onKeyDown = e => {
      if (e.altKey && e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault()
        onPrev?.()
      } else if (e.altKey && e.key === 'ArrowRight' && hasNext) {
        e.preventDefault()
        onNext?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasPrev, hasNext, onPrev, onNext])

  const onHeaderTouchStart = e => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const onHeaderTouchEnd = e => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && hasNext) onNext?.()
      else if (dx > 0 && hasPrev) onPrev?.()
    }
  }

  const handleShare = async () => {
    if (!shareTeamId) return
    setShareOpen(false)
    const shared = await shareNoteToTeam(note.id, shareTeamId)
    if (shared) onDeleted?.()
  }

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
      <div
        className="flex items-center justify-between pb-1 select-none"
        onTouchStart={onHeaderTouchStart}
        onTouchEnd={onHeaderTouchEnd}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 -ml-1 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={onBack}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>{t.notesBack || 'Back'}</span>
            </Button>
          )}
          {folderName && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/80 truncate max-w-[140px] md:max-w-[220px]">
              <Folder className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{folderName}</span>
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <input
          value={sharedMeta ? sharedTitle.title : note.title}
          placeholder={t.notesTitle}
          disabled={Boolean(sharedMeta) && !collab}
          className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/40 disabled:opacity-60"
          onChange={e => (sharedMeta
            ? sharedTitle.onTitleChange(e.target.value)
            : updateNote(note.id, { title: e.target.value }))}
        />
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
          <span>{t.notesLastEdit} {formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
          {sharedMeta && (
            <span className="flex items-center gap-1 rounded-full border border-border/60 px-1.5 py-0.5">
              <Users className="h-3 w-3" />
              {teamName ?? t.collabShared}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 flex-1">
          {sharedMeta ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs"
              title={t.notesSaveLocalCopy}
              onClick={() => saveLocalCopyOfSharedNote(sharedMeta.teamId, sharedMeta.sharedNoteId)}>
              <CopyPlus className="h-3.5 w-3.5" />
              <span>{t.notesSaveLocalCopy}</span>
            </Button>
          ) : (
            <LocalNoteActions
              note={note}
              t={t}
              canShare={teams.length > 0}
              onChangeKind={kind => updateNote(note.id, { kind })}
              onToggleFavorite={() => toggleFavoriteNote(note.id)}
              onToggleArchive={() => note.archived ? unarchiveNote(note.id) : archiveNote(note.id)}
              onToggleOfflineOnly={() => toggleOfflineOnlyNote(note.id)}
              onShare={() => setShareOpen(true)}
            />
          )}

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
        {!sharedMeta && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive transition-colors" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
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
              <RichNoteEditor note={note} collabPlugins={collab?.plugins ?? null} />
            </LazyBoundary>
          )}
      </div>

      <input ref={importRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="sr-only" tabIndex={-1} onChange={handleImport} />

      <ShareToTeamDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={t.collabShareNote}
        teams={teams}
        value={shareTeamId}
        onValueChange={setShareTeamId}
        onConfirm={handleShare}
      />

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
