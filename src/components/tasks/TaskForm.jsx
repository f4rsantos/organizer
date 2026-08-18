import { useMemo, useState } from 'react'
import { differenceInCalendarWeeks, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Circle, CircleCheck, Mic } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { weekDateRange } from '@/lib/semesterUtils'
import { parseTaskText } from '@/lib/parser/nlpParse'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import { getMemberList, getMemberDisplayName } from '@/lib/collab/teamColors'

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
  defaultEisenhower = null,
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
    recurrence: initialData?.recurrence ?? null,
    assigneeUserId: initialData?.assigneeUserId ?? null,
  })
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const userId = useStore(s => s.collab?.userId)
  const sharedTeamId = initialData?.sharedMeta?.teamId ?? initialData?.sharedRef?.teamId ?? null
  const teamMembers = useMemo(() => {
    if (!sharedTeamId) return []
    const team = runtimeTeams[sharedTeamId]
    return getMemberList(team)
  }, [sharedTeamId, runtimeTeams])
  const [weeksManuallySet, setWeeksManuallySet] = useState(false)
  const [touched, setTouched] = useState({ classId: Boolean(initialData?.classId), dueDate: Boolean(initialData?.dueDate) })
  const addTask = useStore(s => s.addTask)

  const resolveWeek = dueDate => (dateToWeekFn ? dateToWeekFn(dueDate) : dateToWeek(dueDate, startDate))

  const [rawTitle, setRawTitle] = useState(initialData?.title ?? '')

  const handleTitleChange = e => {
    const title = e.target.value
    setRawTitle(title)
    setForm(f => ({ ...f, title }))
  }

  const parseTitle = rawValue => {
    if (!rawValue) return form
    const parsed = parseTaskText(rawValue, { classes, t, lang })
    const next = { ...form, title: rawValue }
    if (!touched.classId && parsed.classId) next.classId = parsed.classId
    if (parsed.recurrence && !form.recurrence) next.recurrence = parsed.recurrence
    if (parsed.duration && !form.duration) next.duration = parsed.duration
    if (!touched.dueDate && parsed.date) {
      next.dueDate = parsed.date
      if (!weeksManuallySet) {
        const w = resolveWeek(parsed.date)
        if (w != null && w >= 1 && w <= weekCount) { next.weekStart = w; next.weekEnd = w }
      }
    }
    setForm(next)
    return next
  }

  const handleTitleBlur = () => parseTitle(rawTitle)

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

  const handleRepeatToggle = () => {
    setForm(f => ({
      ...f,
      recurrence: f.recurrence ? null : { freq: 'weekly', interval: 1, until: null },
    }))
  }

  const handleRecurrenceChange = patch => {
    setForm(f => ({ ...f, recurrence: { ...f.recurrence, ...patch } }))
  }

  const [localInterval, setLocalInterval] = useState('')
  const [prevInterval, setPrevInterval] = useState(form.recurrence?.interval)
  if (form.recurrence && form.recurrence.interval !== prevInterval) {
    setLocalInterval(String(form.recurrence.interval))
    setPrevInterval(form.recurrence.interval)
  }

  const handleIntervalBlur = () => {
    let val = Number(localInterval)
    if (isNaN(val) || val < 1) val = 1
    handleRecurrenceChange({ interval: val })
    setLocalInterval(String(val))
  }

  const applyTitle = title => {
    setRawTitle(title)
    setForm(f => ({ ...f, title }))
    parseTitle(title)
  }

  const { isSupported: speechSupported, isListening, start: startListening, stop: stopListening } = useSpeechInput({
    lang,
    onResult: applyTitle,
  })

  const handleSubmit = e => {
    e.preventDefault()
    if (!rawTitle.trim()) return
    const finalForm = rawTitle !== form.title ? parseTitle(rawTitle) : form
    const payload = { semesterId, ...finalForm, dueDate: finalForm.dueDate || null }
    if (defaultEisenhower && !initialData) payload.eisenhower = defaultEisenhower
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
        <Select value={form.classId ?? '__other__'} onValueChange={v => { setTouched(x => ({ ...x, classId: true })); setForm(f => ({ ...f, classId: v === '__other__' ? null : v })) }}>
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

      {teamMembers.length > 0 && (
        <div className="space-y-1.5">
          <Label>{t.collabAssignee ?? 'Assignee'}</Label>
          <Select
            value={form.assigneeUserId ?? '__none__'}
            onValueChange={v => setForm(f => ({ ...f, assigneeUserId: v === '__none__' ? null : v }))}>
            <SelectTrigger>
              <span className="flex items-center gap-2">
                {form.assigneeUserId && teamMembers.find(m => m.userId === form.assigneeUserId) && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: teamMembers.find(m => m.userId === form.assigneeUserId)?.color }}
                  />
                )}
                {form.assigneeUserId
                  ? getMemberDisplayName(teamMembers.find(m => m.userId === form.assigneeUserId), userId, t)
                  : (t.collabUnassigned ?? 'Unassigned')}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t.collabUnassigned ?? 'Unassigned'}</SelectItem>
              {teamMembers.map(m => (
                <SelectItem key={m.userId} value={m.userId}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    {getMemberDisplayName(m, userId, t)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t.task}</Label>
        <div className="relative">
          <Input placeholder={t.whatNeedsDone} value={rawTitle} onChange={handleTitleChange} onBlur={handleTitleBlur} autoFocus
            className={speechSupported ? 'pr-9' : undefined} />
          {speechSupported && (
            <Button type="button" variant="ghost" size="icon-sm"
              className={`absolute right-0.5 top-0.5 ${isListening ? 'text-primary' : 'text-muted-foreground'}`}
              aria-label={isListening ? t.voiceInputStopAria : t.voiceInputAria}
              onClick={() => (isListening ? stopListening() : startListening())}>
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
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

      <button type="button" onClick={handleRepeatToggle}
        className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:bg-secondary/50">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground">{t.repeat}</span>
          <span className="text-muted-foreground">
            {form.recurrence
              ? <CircleCheck className="h-4 w-4 text-primary" />
              : <Circle className="h-4 w-4" />}
          </span>
        </span>
      </button>

      {form.recurrence && (
        <div className="grid grid-cols-2 gap-3 p-3 mt-1.5 rounded-lg border border-border/50 bg-secondary/20">
          <div className="space-y-1.5">
            <Label>{t.repeatFreqLabel}</Label>
            <Select value={form.recurrence.freq} onValueChange={v => handleRecurrenceChange({ freq: v })}>
              <SelectTrigger className="bg-background">
                <span>{{ daily: t.repeatFreqDaily, weekly: t.repeatFreqWeekly, monthly: t.repeatFreqMonthly }[form.recurrence.freq]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t.repeatFreqDaily}</SelectItem>
                <SelectItem value="weekly">{t.repeatFreqWeekly}</SelectItem>
                <SelectItem value="monthly">{t.repeatFreqMonthly}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.repeatEvery(form.recurrence.freq)}</Label>
            <Input type="number" min="1" value={localInterval}
              onChange={e => setLocalInterval(e.target.value)}
              onBlur={handleIntervalBlur}
              className="bg-background" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>{t.repeatUntil}</Label>
            <Input type="date" value={form.recurrence.until ?? ''}
              onChange={e => handleRecurrenceChange({ until: e.target.value || null })}
              className="bg-background" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>{t.dueDate}</Label>
          <Input type="date" value={form.dueDate} onChange={e => { setTouched(x => ({ ...x, dueDate: true })); handleDueDateChange(e) }} />
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
