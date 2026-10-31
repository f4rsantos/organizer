import { useState } from 'react'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { GlassList, GlassPanel } from '@/components/common/GlassPanel'
import { ProgressRing } from '@/components/common/ProgressRing'
import { SvgProgressWheel } from '@/components/common/SvgProgressWheel'
import { cn } from '@/lib/utils'
import { progressColor } from './labels'

const BUCKETS = [
  { id: 'todo', labelKey: 'classesBucketTodo' },
  { id: 'doing', labelKey: 'classesBucketDoing' },
  { id: 'almost', labelKey: 'classesBucketAlmost' },
  { id: 'done', labelKey: 'classesBucketDone' },
]

function overallProgress(summaries) {
  const done = summaries.reduce((sum, s) => sum + s.progress.done, 0)
  const total = summaries.reduce((sum, s) => sum + s.progress.total, 0)
  const lessons = summaries.reduce((sum, s) => sum + s.sessions.length, 0)
  const studied = summaries.reduce((sum, s) => sum + s.sessions.length - s.pending, 0)
  return { pct: total ? done / total : 0, lessons, studied }
}

function percent(pct) {
  return `${Math.round(pct * 100)}%`
}

function classSubtitle(t, summary) {
  if (!summary.pending) return t.classesAllCaughtUp
  return t.classesPendingLessons(summary.pending)
}

function BucketFilter({ t, summaries, status, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {BUCKETS.map(bucket => {
        const active = status === bucket.id
        const count = summaries.filter(s => s.bucket === bucket.id).length
        return (
          <button key={bucket.id} type="button" aria-pressed={active}
            onClick={() => onChange(active ? 'all' : bucket.id)}
            className={cn('min-w-0 rounded-xl border px-1.5 py-1.5 text-left transition-colors',
              active ? 'border-primary bg-primary/15' : 'border-transparent hover:bg-accent/40')}>
            <p className="text-lg font-semibold leading-none tabular-nums">{count}</p>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">
              {t[bucket.labelKey]}
            </p>
          </button>
        )
      })}
    </div>
  )
}

function OverviewHero({ t, summaries, status, onStatusChange }) {
  const overall = overallProgress(summaries)
  return (
    <GlassPanel className="flex items-center gap-4 p-5">
      <SvgProgressWheel pct={overall.pct} size={100} strokeWidth={9}
        center={<span className="text-xl font-semibold tabular-nums">{percent(overall.pct)}</span>} />
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="px-1.5 text-sm text-muted-foreground">{t.classesLessonsStudied(overall.studied, overall.lessons)}</p>
        <BucketFilter t={t} summaries={summaries} status={status} onChange={onStatusChange} />
      </div>
    </GlassPanel>
  )
}

function ClassRow({ t, summary, onOpen }) {
  const { cls, progress } = summary
  return (
    <button type="button" onClick={() => onOpen(cls.id)}
      className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-accent/40">
      <ProgressRing pct={progress.pct} size={42} strokeWidth={4} color={progressColor(progress.pct, cls.color)}>
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{percent(progress.pct)}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-tight">{cls.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{classSubtitle(t, summary)}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </button>
  )
}

function byNeed(a, b) {
  return a.progress.pct - b.progress.pct || b.pending - a.pending
}

export function ClassesOverview({ t, summaries, onOpen }) {
  const [status, setStatus] = useState('all')
  const started = summaries.filter(s => s.sessions.length > 0)
  const shown = started.filter(s => status === 'all' || s.bucket === status).sort(byNeed)

  if (!started.length) {
    return <EmptyState icon={CalendarClock} title={t.classesNoLessons} description={t.classesNoLessonsDesc} />
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">{t.classesPanel}</h1>
      <OverviewHero t={t} summaries={started} status={status} onStatusChange={setStatus} />
      {shown.length > 0 && (
        <GlassList>
          {shown.map(summary => <ClassRow key={summary.cls.id} t={t} summary={summary} onOpen={onOpen} />)}
        </GlassList>
      )}
      {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">{t.classesNoneInStatus}</p>}
    </div>
  )
}
