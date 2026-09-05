import { useRef, useState } from 'react'
import { addDays, format, startOfWeek, parseISO } from 'date-fns'
import { Upload, X, Loader2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { ocrScheduleImage } from '@/lib/calendar/scheduleOcr'
import { buildRowsFromLines } from '@/lib/calendar/scheduleGrid'
import { resolveRowColors } from '@/lib/calendar/scheduleColors'

const EMPTY = { rows: [], reason: null }

export function ScheduleImportPanel({ semesterId, semesterStart, semesterEnd }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const addEvent = useStore(s => s.addEvent)
  const removeImportedEvents = useStore(s => s.removeImportedEvents)
  const recordScheduleImport = useStore(s => s.recordScheduleImport)
  const imports = useStore(s => s.scheduleImports) ?? []
  const allClasses = useStore(s => s.classes)

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(EMPTY)
  const [repeat, setRepeat] = useState(true)
  const fileRef = useRef(null)

  const scan = async file => {
    if (!file) return
    setBusy(true); setError(null); setProgress(0); setResult(EMPTY)
    try {
      const ocr = await ocrScheduleImage(file, { onProgress: setProgress })
      const built = buildRowsFromLines(ocr.words, { boxes: ocr.boxes })
      const scoped = (allClasses ?? []).filter(c => !semesterId || c.semesterId === semesterId)
      const rows = resolveRowColors(built.rows, scoped)
      if (!rows.length) setError(built.reason ?? 'no-boxes')
      setResult({ rows, reason: built.reason })
    } catch (err) {
      setError(err?.message === 'ocr-load-failed' ? 'ocr-load-failed' : 'scan-failed')
    } finally {
      setBusy(false)
    }
  }

  const patch = (i, field, value) => setResult(r => ({
    ...r, rows: r.rows.map((row, k) => (k === i ? { ...row, [field]: value } : row)),
  }))
  const drop = i => setResult(r => ({ ...r, rows: r.rows.filter((_, k) => k !== i) }))

  const dayOptions = t.weekdaysShort.map((d, k) => ({ value: String(k), label: d }))

  const apply = () => {
    const base = semesterStart
      ? startOfWeek(parseISO(semesterStart), { weekStartsOn: 1 })
      : startOfWeek(new Date(), { weekStartsOn: 1 })
    const importId = `imp-${Date.now()}`

    for (const row of result.rows) {
      if (!row.title?.trim()) continue
      addEvent({
        title: row.title.trim(),
        note: row.note?.trim() ?? '',
        color: row.color ?? null,
        date: format(addDays(base, row.dayIndex), 'yyyy-MM-dd'),
        startTime: row.startTime,
        endTime: row.endTime,
        allDay: false,
        semesterId: semesterId ?? null,
        importId,
        recurrence: repeat ? { freq: 'weekly', interval: 1, until: semesterEnd ?? null } : null,
      })
    }
    recordScheduleImport({
      id: importId, count: result.rows.length, at: Date.now(), repeat,
    })
    setResult(EMPTY)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t.scheduleImportDesc}</p>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { scan(e.target.files?.[0]); e.target.value = '' }} />

      <Button variant="outline" size="sm" className="w-full gap-2"
        disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? `${Math.round(progress * 100)}%` : t.scheduleImportPick}
      </Button>

      {error && <p className="text-xs text-destructive">{t.scheduleImportError}</p>}

      <Dialog open={result.rows.length > 0} onOpenChange={open => { if (!open) setResult(EMPTY) }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-baseline justify-between gap-2 pr-6">
              <DialogTitle>{t.scheduleImportPreview}</DialogTitle>
              <p className="text-[11px] text-muted-foreground tabular-nums">{result.rows.length}</p>
            </div>
          </DialogHeader>

          <div className="space-y-2 overflow-y-auto -mx-1 px-1">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t.scheduleImportRepeatLabel}</Label>
              <div className="relative grid grid-cols-2 rounded-full bg-muted/60 p-0.5">
                <div className="absolute inset-y-0.5 w-[calc(50%-4px)] rounded-full bg-background shadow-sm transition-[left] duration-200 ease-out"
                  style={{ left: repeat ? '2px' : 'calc(50% + 2px)' }} />
                <button type="button" onClick={() => setRepeat(true)}
                  className={`relative z-10 rounded-full px-2 py-1.5 text-xs transition-colors ${repeat ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t.scheduleImportEveryWeek}
                </button>
                <button type="button" onClick={() => setRepeat(false)}
                  className={`relative z-10 rounded-full px-2 py-1.5 text-xs transition-colors ${!repeat ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t.scheduleImportThisWeek}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border/60">
              {result.rows.map((row, i) => (
                <div key={i} className="flex items-center gap-1.5 p-1.5">
                  <span className="h-7 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color ?? 'transparent' }} />
                  <Select value={String(row.dayIndex)}
                    onValueChange={v => patch(i, 'dayIndex', Number(v))}
                    items={dayOptions}>
                    <SelectTrigger className="h-7 w-[68px] shrink-0 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {dayOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <input value={row.startTime} onChange={e => patch(i, 'startTime', e.target.value)}
                    inputMode="numeric"
                    className="h-7 w-[52px] shrink-0 rounded-md border border-border bg-background px-1 text-xs tabular-nums text-center" />
                  <input value={row.endTime ?? ''} onChange={e => patch(i, 'endTime', e.target.value)}
                    inputMode="numeric"
                    className="h-7 w-[52px] shrink-0 rounded-md border border-border bg-background px-1 text-xs tabular-nums text-center" />

                  <div className="min-w-0 flex-1 space-y-1">
                    <input value={row.title} onChange={e => patch(i, 'title', e.target.value)}
                      placeholder={t.scheduleImportTitleField}
                      className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs font-medium" />
                    <input value={row.note ?? ''} onChange={e => patch(i, 'note', e.target.value)}
                      placeholder={t.scheduleImportNoteField}
                      className="h-7 w-full rounded-md border border-border bg-background px-2 text-[11px] text-muted-foreground" />
                  </div>

                  <button type="button" onClick={() => drop(i)} title={t.delete}
                    className="h-7 w-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setResult(EMPTY)}>{t.cancel}</Button>
            <Button size="sm" onClick={apply} disabled={!result.rows.length}>
              {t.scheduleImportConfirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {imports.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium">{t.scheduleImportHistory}</p>
          {imports.map(imp => (
            <div key={imp.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
              <span className="flex-1 truncate tabular-nums">
                {format(imp.at, 'd MMM HH:mm')} · {imp.count}
              </span>
              <button type="button" onClick={() => removeImportedEvents(imp.id)}
                className="flex items-center gap-1 rounded px-1 py-0.5 hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Undo2 className="h-3 w-3" />
                {t.scheduleImportUndo}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
