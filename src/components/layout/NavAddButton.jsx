import { useState } from 'react'
import { Plus, CheckSquare, Kanban, CalendarDays, StickyNote } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaskForm } from '@/components/tasks/TaskForm'
import { EventForm } from '@/components/calendar/EventForm'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useWeekContext } from '@/hooks/useWeekContext'
import { cn } from '@/lib/utils'

const ACTION_META = {
  task: { icon: CheckSquare, key: 'addTask' },
  kanban: { icon: Kanban, key: 'addCard' },
  event: { icon: CalendarDays, key: 'addEvent' },
  note: { icon: StickyNote, key: 'notesNew' },
}

export function NavAddButton({ variant = 'bottom', labelMode = 'both' }) {
  const [dialog, setDialog] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const allClasses = useStore(s => s.classes)
  const notesEnabled = useStore(s => s.settings?.apps?.notes === true)
  const configured = useStore(s => s.settings?.navbar?.addAction) ?? 'task'
  const addKanbanCard = useStore(s => s.addKanbanCard)
  const addNote = useStore(s => s.addNote)
  const setTab = useStore(s => s.setActiveTab)
  const { semester, mode, currentWeek, weekCount, weekDateRange, dateToWeek } = useWeekContext()
  const noneMode = mode === 'none'
  const scopeId = noneMode ? null : (semester?.id ?? null)
  const boardId = scopeId ?? '__free__'
  const classes = allClasses.filter(c => c.semesterId === scopeId)
  const rangeFor = noneMode ? weekDateRange : null
  const dateToWeekFn = noneMode ? dateToWeek : null

  const runAction = action => {
    if (action === 'note') {
      const enabled = notesEnabled
      if (enabled) {
        const id = crypto.randomUUID?.() ?? String(Date.now())
        addNote({ id, kind: 'text' })
        setTab?.('notes')
      } else setDialog('task')
      return
    }
    if (action === 'kanban') {
      addKanbanCard(boardId, { title: '', columnId: null, order: 0 })
      setTab?.('kanban')
      return
    }
    setDialog(action)
  }

  const onClick = () => {
    if (configured === 'picker') setPickerOpen(true)
    else runAction(configured)
  }

  const label = configured === 'picker' ? t.add : t[ACTION_META[configured]?.key ?? 'addTask']
  const showIcon = labelMode !== 'names'
  const showLabel = labelMode !== 'icons'
  const trigger =
    variant === 'sidebar' ? (
      <button onClick={onClick}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors text-left">
        {showIcon && <Plus className="h-4 w-4 shrink-0" />} {showLabel && label}
      </button>
    ) : variant === 'sidebar-collapsed' ? (
      <button onClick={onClick}
        className="flex items-center justify-center rounded-lg px-3 py-2.5 text-primary hover:text-primary transition-colors">
        <Plus className="h-4 w-4" />
      </button>
    ) : variant === 'menu' ? (
      <button onClick={onClick}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary hover:bg-secondary transition-colors text-left">
        <Plus className="h-4 w-4 shrink-0" /> {label}
      </button>
    ) : (
      <button onClick={onClick}
        className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-xs text-primary')}>
        {showIcon && <Plus className="h-5 w-5" />}
        {showLabel && <span className="font-medium truncate max-w-full">{label}</span>}
      </button>
    )

  const pickerActions = ['task', 'kanban', 'event', ...(notesEnabled ? ['note'] : [])]
  const menuAnchor = variant === 'sidebar' || variant === 'sidebar-collapsed'
    ? 'left-0 bottom-full mb-2'
    : 'right-0 bottom-full mb-2'

  return (
    <div className={cn('relative', (variant === 'bottom') && 'min-w-0 flex-1 flex')}>
      {trigger}

      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
          <div className={cn('absolute z-50 min-w-40 rounded-xl border border-border bg-background p-1 shadow-lg', menuAnchor)}>
            {pickerActions.map(a => {
              const Icon = ACTION_META[a].icon
              return (
                <button key={a} onClick={() => { setPickerOpen(false); runAction(a) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors text-left">
                  <Icon className="h-4 w-4 shrink-0 text-primary" /> {t[ACTION_META[a].key]}
                </button>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={dialog === 'task'} onOpenChange={v => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.addTask}</DialogTitle></DialogHeader>
          {dialog === 'task' && (
            <TaskForm
              semesterId={scopeId}
              classes={classes}
              weekCount={weekCount}
              defaultWeek={currentWeek}
              startDate={semester?.startDate}
              rangeFor={rangeFor}
              dateToWeekFn={dateToWeekFn}
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {dialog === 'event' && (
        <EventForm open onOpenChange={v => !v && setDialog(null)}
          event={null} semesterId={scopeId} defaultDate={null} />
      )}
    </div>
  )
}
