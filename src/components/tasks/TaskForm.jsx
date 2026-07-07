import { useState } from 'react'
import { differenceInCalendarWeeks, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Circle, CircleCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { weekDateRange } from '@/lib/semesterUtils'

function dateToWeek(dateStr, semesterStartDate) {
  if (!dateStr || !semesterStartDate) return null
  const week = differenceInCalendarWeeks(parseISO(dateStr), parseISO(semesterStartDate), { weekStartsOn: 1 }) + 1
  return week
}

export function TaskForm({
  semesterId,
  classes,
  weekCount,
  defaultWeek,
  startDate,
  rangeFor = null,
  dateToWeekFn = null,
  onDone,
  initialData = null,
  onSubmitTask,
  submitLabel,
}) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const taskDefaultToCalendar = useStore(s => s.settings?.taskDefaultToCalendar ?? false)
  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    classId: initialData?.classId ?? null,
    priority: initialData?.priority ?? null,
    dueDate: initialData?.dueDate ?? '',
    weekStart: initialData?.weekStart ?? (defaultWeek ?? 1),
    weekEnd: initialData?.weekEnd ?? (defaultWeek ?? 1),
    views: {
      list: initialData?.views?.list ?? true,
      kanban: initialData?.views?.kanban ?? false,
      calendar: initialData?.views?.calendar ?? taskDefaultToCalendar,
    },
  })
  const [weeksManuallySet, setWeeksManuallySet] = useState(false)
  const addTask = useStore(s => s.addTask)

  const resolveWeek = dueDate => (dateToWeekFn ? dateToWeekFn(dueDate) : dateToWeek(dueDate, startDate))

  const handleDueDateChange = e => {
    const dueDate = e.target.value
    setForm(f => {
      if (!weeksManuallySet && dueDate) {
        const w = resolveWeek(dueDate)
        if (w != null && w >= 1 && w <= weekCount)
          return { ...f, dueDate, weekStart: w, weekEnd: w }
      }
      return { ...f, dueDate }
    })
  }

  const rangeLabel = w => (rangeFor ? rangeFor(w) : (startDate ? weekDateRange(startDate, w) : null))

  const handleWeekStart = v => {
    setWeeksManuallySet(true)
    setForm(f => ({ ...f, weekStart: Number(v), weekEnd: Math.max(Number(v), f.weekEnd) }))
  }

  const handleWeekEnd = v => {
    setWeeksManuallySet(true)
    setForm(f => ({ ...f, weekEnd: Number(v) }))
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (!form.title.trim()) return
    const payload = { semesterId, ...form, dueDate: form.dueDate || null }
    if (onSubmitTask) onSubmitTask(payload)
    else addTask(payload)
    onDone?.()
  }

  const weeks = Array.from({ length: weekCount }, (_, i) => i + 1)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>{t.class}</Label>
        <Select value={form.classId ?? '__other__'} onValueChange={v => setForm(f => ({ ...f, classId: v === '__other__' ? null : v }))}>
          <SelectTrigger>
            <span>{form.classId ? (classes.find(c => c.id === form.classId)?.name ?? t.other) : t.other}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__other__">{t.other}</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t.priority}</Label>
        <Select value={form.priority ?? '__none__'} onValueChange={v => setForm(f => ({ ...f, priority: v === '__none__' ? null : v }))}>
          <SelectTrigger>
            <span>{{ '__none__': t.none, high: t.high, medium: t.medium, low: t.low }[form.priority ?? '__none__'] ?? t.none}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t.none}</SelectItem>
            <SelectItem value="high">{t.high}</SelectItem>
            <SelectItem value="medium">{t.medium}</SelectItem>
            <SelectItem value="low">{t.low}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t.task}</Label>
        <Input placeholder={t.whatNeedsDone} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
      </div>

      <button type="button" onClick={() => setForm(f => ({ ...f, views: { ...f.views, calendar: !f.views.calendar } }))}
        className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">{t.showOnCalendar}</span>
          <span className="text-muted-foreground">
            {form.views.calendar
              ? <CircleCheck className="h-4 w-4 text-primary" />
              : <Circle className="h-4 w-4" />}
          </span>
        </span>
      </button>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>{t.dueDate}</Label>
          <Input type="date" value={form.dueDate} onChange={handleDueDateChange} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.fromWeek}</Label>
          <Select value={String(form.weekStart)} onValueChange={handleWeekStart}>
            <SelectTrigger><span>W{form.weekStart}</span></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>{weeks.map(w => {
              const r = rangeLabel(w)
              return <SelectItem key={w} value={String(w)}>{r ? `W${w} · ${r.start}–${r.end}` : `W${w}`}</SelectItem>
            })}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t.toWeek}</Label>
          <Select value={String(form.weekEnd)} onValueChange={handleWeekEnd}>
            <SelectTrigger><span>W{form.weekEnd}</span></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>{weeks.filter(w => w >= form.weekStart).map(w => {
              const r = rangeLabel(w)
              return <SelectItem key={w} value={String(w)}>{r ? `W${w} · ${r.start}–${r.end}` : `W${w}`}</SelectItem>
            })}</SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full">{submitLabel ?? t.addTaskBtn}</Button>
    </form>
  )
}
