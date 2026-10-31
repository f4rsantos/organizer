import { BookOpenCheck, CalendarDays, CheckSquare, Coffee, Kanban, Timer } from 'lucide-react'
import { GlassPanel } from '@/components/common/GlassPanel'
import { shortDate } from '@/lib/dateLabels'
import { briefText } from './briefVisuals'
import { CardAction } from './CardAction'
import { countdownLabel, highlightContext, highlightKindLabel } from './highlightLabels'

const REC_META = {
  study: { icon: BookOpenCheck, labelKey: 'todayRecStudyLabel', tab: 'classesPanel' },
  task: { icon: CheckSquare, labelKey: 'tasks', tab: 'tasks' },
  kanban: { icon: Kanban, labelKey: 'kanban', tab: 'kanban' },
  rest: { icon: Coffee, labelKey: 'todayRecRestLabel', tab: null },
}
const TAB_LABEL_KEYS = { classesPanel: 'classesPanel', tasks: 'tasks', kanban: 'kanban' }

function CardHeader({ icon: Icon, label }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />{label}
    </p>
  )
}

function scheduleEntries(lessons, events) {
  return [
    ...lessons.map(lesson => ({ label: lesson.name, startTime: lesson.startTime, color: lesson.color })),
    ...events.map(event => ({ label: event.title, startTime: event.startTime, color: event.color })),
  ].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
}

export function ScheduleCard({ t, lessons, events, tasksDue, overdue }) {
  const entries = scheduleEntries(lessons, events)
  return (
    <GlassPanel className="p-5">
      <CardHeader icon={CalendarDays} label={t.todayScheduleTitle} />
      <ul className="space-y-2">
        {entries.map((entry, index) => (
          <li key={`${entry.label}-${index}`} className="flex items-center gap-2.5 text-sm">
            <span className="w-11 shrink-0 tabular-nums text-xs text-muted-foreground">{entry.startTime ?? ''}</span>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color ?? 'var(--primary)' }} />
            <span className="truncate">{entry.label}</span>
          </li>
        ))}
        {!entries.length && <li className="text-sm text-muted-foreground">{t.widgetAgendaEmpty}</li>}
      </ul>
      {(tasksDue > 0 || overdue > 0) && (
        <div className="mt-3 space-y-0.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {tasksDue > 0 && <p>{t.todayTasksDue(tasksDue)}</p>}
          {overdue > 0 && <p className="text-destructive">{t.todayOverdue(overdue)}</p>}
        </div>
      )}
    </GlassPanel>
  )
}

export function UpcomingCard({ t, items }) {
  return (
    <GlassPanel className="p-5">
      <CardHeader icon={Timer} label={t.todayUpcomingTitle} />
      <ul className="space-y-3">
        {items.map(item => (
          <li key={`${item.kind}-${item.id}-${item.date}`} className="flex items-start gap-3">
            <span className="w-12 shrink-0 text-center leading-none">
              {item.daysLeft === 0
                ? <span className="block text-xs font-semibold">{t.todayDueToday}</span>
                : <span className="block text-lg font-semibold tabular-nums">{item.daysLeft}</span>}
              {item.daysLeft > 0 && <span className="mt-1 block text-[10px] text-muted-foreground">{countdownLabel(t, item.daysLeft)}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{item.title}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {[highlightKindLabel(t, item), shortDate(t, item.date), highlightContext(item)].filter(Boolean).join(' · ')}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </GlassPanel>
  )
}

function reasonParts(t, rec) {
  return [
    rec.kind === 'kanban' ? t.todayReasonColumn(rec.column) : null,
    rec.daysLeft == null ? null : t.todayReasonDue(rec.daysLeft),
    rec.checklist ? t.todayReasonChecklist(rec.checklist.done, rec.checklist.total) : null,
    rec.highPriority ? t.todayReasonHighPriority : null,
  ].filter(Boolean)
}

function WorkItem({ t, rec }) {
  return (
    <div className="flex-1 space-y-1">
      <p className="text-sm font-medium leading-snug">{rec.title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{reasonParts(t, rec).join(' · ')}</p>
    </div>
  )
}

export function RecommendationCard({ t, rec, classesPanelEnabled, onNavigate }) {
  const { icon, labelKey, tab } = REC_META[rec.kind]
  const reachable = tab && (tab !== 'classesPanel' || classesPanelEnabled)
  const isWork = rec.kind === 'task' || rec.kind === 'kanban'
  return (
    <GlassPanel className="flex flex-col p-5">
      <CardHeader icon={icon} label={t[labelKey]} />
      {isWork ? <WorkItem t={t} rec={rec} /> : <p className="flex-1 text-sm leading-relaxed">{briefText(t, rec)}</p>}
      {reachable && <CardAction label={t[TAB_LABEL_KEYS[tab]]} onClick={() => onNavigate(tab)} />}
    </GlassPanel>
  )
}
