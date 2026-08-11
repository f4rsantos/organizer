import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { SvgProgressWheel } from '@/components/common/SvgProgressWheel'
import { TaskItem } from './TaskItem'
import { splitCompletedTasks } from '@/lib/taskUtils'
import { cn } from '@/lib/utils'

export function ClassSection({ cls, tasks, ratio }) {
  const userId = useStore(s => s.collab?.userId)
  const hideCompleted = useStore(s => s.settings?.hideCompletedTasks ?? false)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const { pending, completed } = splitCompletedTasks(tasks, userId)
  const done = completed.length
  const visible = hideCompleted ? pending : tasks
  const [open, setOpen] = useState(() => {
    if (tasks.length === 0) return false
    return done < tasks.length
  })
  const [completedOpen, setCompletedOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors">
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
        <span className="flex-1 font-medium text-sm">{cls.name}</span>
        <span className="text-xs text-muted-foreground">{done}/{tasks.length}</span>
        <SvgProgressWheel pct={ratio} size={28} strokeWidth={4} />
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="divide-y divide-border/50 border-t border-border/50">
          {visible.length === 0 && (!hideCompleted || done === 0)
            ? <p className="px-4 py-3 text-sm text-muted-foreground">{t.noTasks}</p>
            : visible.map(task => <TaskItem key={task.id} task={task} />)
          }
          {hideCompleted && done > 0 && (
            <div>
              <button onClick={() => setCompletedOpen(o => !o)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-secondary/30 transition-colors">
                <span className="flex-1 text-xs font-medium text-muted-foreground">{t.completedTasks(done)}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', completedOpen && 'rotate-180')} />
              </button>
              {completedOpen && (
                <div className="divide-y divide-border/50 border-t border-border/50">
                  {completed.map(task => <TaskItem key={task.id} task={task} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
