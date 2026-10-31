import { parseISO } from 'date-fns'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mondayIndex } from '@/lib/dateLabels'
import { lessonTypeLabel } from './labels'

function DateBlock({ t, iso }) {
  const date = parseISO(iso)
  return (
    <div className="flex w-10 shrink-0 flex-col items-center leading-none">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {t.weekdaysShort[mondayIndex(date)]}
      </span>
      <span className="mt-1 text-lg font-semibold tabular-nums">{date.getDate()}</span>
    </div>
  )
}

function StepDots({ session, studyTypes, color }) {
  return (
    <div className="flex items-center gap-1">
      {studyTypes.map(type => (
        <span key={type.id} className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: session.studied?.[type.id] ? color : 'var(--wheel-track)' }} />
      ))}
    </div>
  )
}

function CompletionMark({ session, studyTypes }) {
  const ticked = studyTypes.filter(type => session.studied?.[type.id]).length
  if (ticked === studyTypes.length) return <Check className="h-4 w-4 shrink-0 text-[var(--done,#22c55e)]" />
  return <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{ticked}/{studyTypes.length}</span>
}

export function LessonRow({ t, color, session, studyTypes, lessonTypes, onOpen }) {
  const done = studyTypes.every(type => session.studied?.[type.id])
  const typeLabel = lessonTypeLabel(t, session.type, lessonTypes)
  return (
    <button type="button" onClick={onOpen}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40">
      <DateBlock t={t} iso={session.date} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={cn('truncate text-sm', done && 'text-muted-foreground')}>{session.theme || typeLabel}</p>
        <div className="flex items-center gap-2">
          <StepDots session={session} studyTypes={studyTypes} color={color} />
          {session.theme && <span className="truncate text-[11px] text-muted-foreground">{typeLabel}</span>}
        </div>
      </div>
      <CompletionMark session={session} studyTypes={studyTypes} />
    </button>
  )
}
