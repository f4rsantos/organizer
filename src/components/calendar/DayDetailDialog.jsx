import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Share2, StickyNote } from 'lucide-react'
import { noteKeyForEvent } from './calendarUtils'
import { readableTextColor } from '@/lib/calendar/contrast'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useWeatherForecast } from '@/hooks/useWeatherForecast'
import { WeatherIcon } from './WeatherIcon'

export function DayDetailDialog({ open, onOpenChange, day, holidays, tasks, events, classes, onAddEvent, onEditEvent, onEditTask, onShareEvent, canShare = false }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const notesEnabled = useStore(s => s.settings?.apps?.notes === true)
  const calendarLinkEnabled = useStore(s => s.settings?.notesCalendarLink === true)
  const showNoteButton = notesEnabled && calendarLinkEnabled
  const dialogBg = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#ffffff'
  const notes = useStore(s => s.notes)
  const openNoteForEvent = useStore(s => s.openNoteForEvent)
  const forecast = useWeatherForecast()
  const dayWeather = day ? forecast?.find(d => d.date === format(day, 'yyyy-MM-dd')) : null
  if (!day) return null

  const openNote = event => {
    const key = noteKeyForEvent(event, day)
    if (!key) return
    const dateLabel = `${day.getDate()} ${t.months[day.getMonth()]} ${day.getFullYear()}`
    const time = event.startTime ? ` ${event.startTime}` : ''
    const isSeries = Boolean(event.isRecurringOccurrence || event.recurrence)
    const seriesId = event.templateId ?? event.id
    openNoteForEvent({
      key,
      title: `${event.title} - ${dateLabel}${time}`,
      seriesKey: isSeries && seriesId ? `event:${seriesId}` : null,
      seriesName: event.title,
    })
    onOpenChange?.(false)
  }

  const hasNote = event => {
    const key = noteKeyForEvent(event, day)
    return Boolean(key && (notes ?? []).some(n => n.linkedEventKey === key))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize flex items-center gap-2">
            <span>{t.weekdays[(day.getDay() + 6) % 7]}, {day.getDate()} {t.months[day.getMonth()]} {day.getFullYear()}</span>
            {dayWeather && <WeatherIcon code={dayWeather.code} className="h-4 w-4 text-muted-foreground shrink-0" />}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto">
          {holidays.map(h => (
            <div key={h.id} className="text-xs px-2 py-1.5 rounded-sm bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {h.name}
            </div>
          ))}
          {events.map(e => {
            const color = e.color ?? '#6366f1'
            const style = { backgroundColor: color + '1f', color: readableTextColor(color, { background: dialogBg }) }
            if (e._remote) return (
              <div key={e.id} className="text-xs px-2 py-1.5 rounded-sm" style={style}>
                <span className="font-medium">{e.title}</span>
                {e.note ? <span className="block opacity-70">{e.note}</span> : null}
              </div>
            )
            const shareable = canShare && onShareEvent && !e.sharedMeta && !e.sharedRef
            return (
              <div key={e.id} className="flex items-stretch gap-1">
                <button onClick={() => onEditEvent(e)}
                  className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-sm text-left transition-opacity hover:opacity-80" style={style}>
                  <span className="font-medium">{e.title}</span>
                  {e.note ? <span className="block opacity-70">{e.note}</span> : null}
                </button>
                {showNoteButton && (
                  <button onClick={() => openNote(e)}
                    title={hasNote(e) ? t.calendarOpenNote : t.calendarCreateNote}
                    className={`shrink-0 flex items-center px-1.5 transition-colors ${hasNote(e) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    <StickyNote className="h-3.5 w-3.5" />
                  </button>
                )}
                {shareable && (
                  <button onClick={() => onShareEvent(e)} title={t.collabShareEvent}
                    className="shrink-0 flex items-center px-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
          {tasks.map(tk => {
            const cls = classes.find(c => c.id === tk.classId)
            const color = cls?.color ?? '#6366f1'
            const style = { backgroundColor: color + '1f', color }
            const label = cls ? `${tk.title} - ${cls.name}` : tk.title
            if (!onEditTask || tk._remote) return (
              <div key={tk.id} className="text-xs px-2 py-1.5 rounded-sm" style={style}>
                {label}
              </div>
            )
            return (
              <button key={tk.id} onClick={() => onEditTask(tk)}
                className="text-xs px-2 py-1.5 rounded-sm text-left transition-opacity hover:opacity-80" style={style}>
                {label}
              </button>
            )
          })}
          {!holidays.length && !events.length && !tasks.length && (
            <p className="text-xs text-muted-foreground py-2">—</p>
          )}
        </div>
        <Button size="sm" className="gap-1 self-start" onClick={onAddEvent}>
          <Plus className="h-3.5 w-3.5" /> {t.addEvent}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
