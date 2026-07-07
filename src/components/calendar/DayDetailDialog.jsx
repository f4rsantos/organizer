import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export function DayDetailDialog({ open, onOpenChange, day, holidays, tasks, events, classes, onAddEvent, onEditEvent }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  if (!day) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{format(day, 'EEEE, d MMMM yyyy')}</DialogTitle>
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
            return (
              <button key={e.id} onClick={() => onEditEvent(e)}
                className="text-xs px-2 py-1.5 rounded-md text-left transition-opacity hover:opacity-80" style={style}>
                <span className="font-medium">{e.title}</span>
                {e.note ? <span className="block opacity-70">{e.note}</span> : null}
              </button>
            )
          })}
          {tasks.map(tk => {
            const cls = classes.find(c => c.id === tk.classId)
            const color = cls?.color ?? '#6366f1'
            return (
              <div key={tk.id} className="text-xs px-2 py-1.5 rounded-md" style={{ backgroundColor: color + '22', color }}>
                {cls ? `${tk.title} - ${cls.name}` : tk.title}
              </div>
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
