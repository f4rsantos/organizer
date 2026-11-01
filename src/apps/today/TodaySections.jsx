import { AlertCircle, CheckSquare } from 'lucide-react'
import { GlassList } from '@/components/common/GlassPanel'
import { shortDate } from '@/lib/dateLabels'
import { cn } from '@/lib/utils'
import { briefText } from './briefVisuals'
import { highlightContext, highlightKindLabel, highlightTab } from './highlightLabels'
import { TodayRow, TodaySection } from './TodayRow'

const REC_META = {
  study: { labelKey: 'todayRecStudyLabel', tab: 'classesPanel' },
  task: { labelKey: 'tasks', tab: 'tasks' },
  kanban: { labelKey: 'kanban', tab: 'kanban' },
  rest: { labelKey: 'todayRecRestLabel', tab: null },
}

function scheduleEntries(lessons, events) {
  return [
    ...lessons.map(lesson => ({ label: lesson.name, startTime: lesson.startTime, color: lesson.color })),
    ...events.map(event => ({ label: event.title, startTime: event.startTime, color: event.color })),
  ].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
}

function TimeSlot({ time, color }) {
  return (
    <span className="flex w-full items-center justify-between">
      <span className="text-xs tabular-nums text-muted-foreground">{time ?? ''}</span>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color ?? 'var(--primary)' }} />
    </span>
  )
}

export function ScheduleSection({ t, lessons, events, tasksDue, overdue, onNavigate }) {
  const entries = scheduleEntries(lessons, events)
  if (!entries.length && !tasksDue && !overdue) return null
  return (
    <TodaySection title={t.todayScheduleTitle}>
      <GlassList>
        {entries.map((entry, index) => (
          <TodayRow key={`${entry.label}-${index}`} leading={<TimeSlot time={entry.startTime} color={entry.color} />}
            title={entry.label} onClick={() => onNavigate('calendar')} />
        ))}
        {tasksDue > 0 && (
          <TodayRow leading={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
            title={t.todayTasksDue(tasksDue)} onClick={() => onNavigate('tasks')} />
        )}
        {overdue > 0 && (
          <TodayRow leading={<AlertCircle className="h-4 w-4 text-destructive" />} tone="alert"
            title={t.todayOverdue(overdue)} onClick={() => onNavigate('tasks')} />
        )}
      </GlassList>
    </TodaySection>
  )
}

function DueLabel({ t, item }) {
  const isToday = item.daysLeft === 0
  return (
    <span className="shrink-0 text-right leading-tight">
      <span className={cn('block text-xs font-medium tabular-nums', isToday && 'text-primary')}>
        {isToday ? t.todayDueToday : t.todayInDays(item.daysLeft)}
      </span>
      <span className="block text-[11px] text-muted-foreground">{shortDate(t, item.date)}</span>
    </span>
  )
}

export function UpcomingSection({ t, items, onNavigate }) {
  return (
    <TodaySection title={t.todayUpcomingTitle}>
      <GlassList>
        {items.map(item => (
          <TodayRow key={`${item.kind}-${item.id}-${item.date}`}
            title={item.title}
            subtitle={[highlightKindLabel(t, item), highlightContext(item)].filter(Boolean).join(' · ')}
            trailing={<DueLabel t={t} item={item} />}
            onClick={() => onNavigate(highlightTab(item))} />
        ))}
      </GlassList>
    </TodaySection>
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

function recommendationLines(t, rec) {
  const label = t[REC_META[rec.kind].labelKey]
  if (rec.kind === 'task' || rec.kind === 'kanban') {
    return { title: rec.title, subtitle: [label, ...reasonParts(t, rec)].join(' · ') }
  }
  return { title: briefText(t, rec), subtitle: label, wrapTitle: true }
}

function recommendationTab(rec, classesPanelEnabled) {
  const { tab } = REC_META[rec.kind]
  if (tab === 'classesPanel' && !classesPanelEnabled) return null
  return tab
}

export function NextStepsSection({ t, recs, classesPanelEnabled, onNavigate }) {
  return (
    <TodaySection title={t.todayNextStepsTitle}>
      <GlassList>
        {recs.map(rec => {
          const tab = recommendationTab(rec, classesPanelEnabled)
          return (
            <TodayRow key={rec.kind} {...recommendationLines(t, rec)} onClick={tab ? () => onNavigate(tab) : null} />
          )
        })}
      </GlassList>
    </TodaySection>
  )
}
