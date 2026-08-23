import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Share2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export function DayDetailDialog({ open, onOpenChange, day, holidays, tasks, events, classes, onAddEvent, onEditEvent, onEditTask, onShareEvent, canShare = false }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  if (!day) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{t.weekdays[(day.getDay() + 6) % 7]}, {day.getDate()} {t.months[day.getMonth()]} {day.getFullYear()}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto">
          {holidays.map(h => (
            <div key={h.id} className="text-xs px-2 py-1.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {h.name}
            </div>
          ))}
          {events.map(e => {
            const style = { backgroundColor: (e.color ?? '#6366f1') + '22', color: e.color ?? '#6366f1' }
            if (e._remote) return (
              <div key={e.id} className="text-xs px-2 py-1.5 rounded-md" style={style}>
                <span className="font-medium">{e.title}</span>
                {e.note ? <span className="block opacity-70">{e.note}</span> : null}
              </div>
            )
            const shareable = canShare && onShareEvent && !e.sharedMeta && !e.sharedRef
            return (
              <div key={e.id} className="flex items-stretch gap-1">
                <button onClick={() => onEditEvent(e)}
                  className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-md text-left transition-opacity hover:opacity-80" style={style}>
                  <span className="font-medium">{e.title}</span>
                  {e.note ? <span className="block opacity-70">{e.note}</span> : null}
                </button>
                {shareable && (
                  <button onClick={() => onShareEvent(e)} title={t.collabShareEvent}
                    className="shrink-0 px-2 rounded-md transition-opacity hover:opacity-80" style={style}>
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
          {tasks.map(tk => {
            const cls = classes.find(c => c.id === tk.classId)
            const color = cls?.color ?? '#6366f1'
            const style = { backgroundColor: color + '22', color }
            const label = cls ? `${tk.title} - ${cls.name}` : tk.title
            if (!onEditTask || tk._remote) return (
              <div key={tk.id} className="text-xs px-2 py-1.5 rounded-md" style={style}>
                {label}
              </div>
            )
            return (
              <button key={tk.id} onClick={() => onEditTask(tk)}
                className="text-xs px-2 py-1.5 rounded-md text-left transition-opacity hover:opacity-80" style={style}>
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
