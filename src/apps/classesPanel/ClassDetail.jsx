import { useState } from 'react'
import { ArrowDownUp, CalendarClock, ChevronLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { GlassList, GlassPanel } from '@/components/common/GlassPanel'
import { ProgressRing } from '@/components/common/ProgressRing'
import { useStore } from '@/store/useStore'
import { arrangeSessions } from '@/lib/classes/lessons'
import { LessonRow } from './LessonRow'
import { LessonSheet } from './LessonSheet'
import { lessonTypeLabel, progressColor } from './labels'
import { ChoiceChip } from './ChoiceChip'

function TopBar({ t, onBack }) {
  return (
    <div className="flex items-center">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onBack}>
        <ChevronLeft />{t.classesPanel}
      </Button>
    </div>
  )
}

function DetailHero({ t, summary, onAddLesson }) {
  const { cls, progress, sessions, pending } = summary
  return (
    <GlassPanel className="flex items-center gap-5 p-5">
      <ProgressRing pct={progress.pct} size={96} strokeWidth={8} color={progressColor(progress.pct, cls.color)}>
        <span className="text-lg font-semibold tabular-nums">{Math.round(progress.pct * 100)}%</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight">{cls.name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.classesLessonsStudied(sessions.length - pending, sessions.length)}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={onAddLesson}>
          <Plus />{t.classesAddLesson}
        </Button>
      </div>
    </GlassPanel>
  )
}

function TypeChips({ t, types, lessonTypes, value, onChange }) {
  if (types.length < 2) return <div />
  return (
    <div className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1">
      {['all', ...types].map(type => (
        <ChoiceChip key={type} active={value === type} onClick={() => onChange(type)}>
          {type === 'all' ? t.classesTypeAll : lessonTypeLabel(t, type, lessonTypes)}
        </ChoiceChip>
      ))}
    </div>
  )
}

function SortToggle({ t, order, onChange }) {
  const next = order === 'newest' ? 'oldest' : 'newest'
  return (
    <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={() => onChange(next)}>
      <ArrowDownUp />
      {order === 'newest' ? t.classesSortNewest : t.classesSortOldest}
    </Button>
  )
}

export function ClassDetail({ t, summary, lessonTypes, today, onBack }) {
  const addManualLesson = useStore(s => s.addManualLesson)
  const [order, setOrder] = useState('newest')
  const [typeFilter, setTypeFilter] = useState('all')
  const [openKey, setOpenKey] = useState(null)
  const { cls, sessions, studyTypes } = summary
  const presentTypes = [...new Set(sessions.map(s => s.type))]
  const activeFilter = presentTypes.includes(typeFilter) ? typeFilter : 'all'
  const shown = arrangeSessions(sessions, { order, type: activeFilter })
  const openSession = sessions.find(s => s.key === openKey) ?? null

  const addLesson = () => {
    const key = addManualLesson(cls.id, { date: today, type: activeFilter === 'all' ? 'other' : activeFilter })
    setOpenKey(key)
  }

  return (
    <div className="space-y-5">
      <TopBar t={t} onBack={onBack} />
      <DetailHero t={t} summary={summary} onAddLesson={addLesson} />
      {sessions.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <TypeChips t={t} types={presentTypes} lessonTypes={lessonTypes} value={activeFilter} onChange={setTypeFilter} />
          <SortToggle t={t} order={order} onChange={setOrder} />
        </div>
      )}
      {sessions.length === 0 && (
        <EmptyState icon={CalendarClock} title={t.classesNoLessons} description={t.classesNoLessonsDesc} className="py-10" />
      )}
      {shown.length > 0 && (
        <GlassList>
          {shown.map(session => (
            <LessonRow key={session.key} t={t} color={cls.color} session={session} studyTypes={studyTypes} lessonTypes={lessonTypes}
              onOpen={() => setOpenKey(session.key)} />
          ))}
        </GlassList>
      )}
      {openSession && (
        <LessonSheet t={t} classId={cls.id} session={openSession} studyTypes={studyTypes} lessonTypes={lessonTypes}
          onClose={() => setOpenKey(null)} />
      )}
    </div>
  )
}
