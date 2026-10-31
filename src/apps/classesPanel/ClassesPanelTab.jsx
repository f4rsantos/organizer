import { useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { useStrings } from '@/lib/strings'
import { EmptyState } from '@/components/common/EmptyState'
import { classSummary } from '@/lib/classes/lessons'
import { useStudyCalendar } from '@/hooks/useStudyCalendar'
import { ClassesOverview } from './ClassesOverview'
import { ClassDetail } from './ClassDetail'
import { ClassesTable } from './ClassesTable'
import { useClassesSettings } from './useClassesSettings'

export function ClassesPanelTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const lessons = useStore(s => s.lessons)
  const { today, nowTime, classes, events } = useStudyCalendar()
  const [selectedId, setSelectedId] = useState(null)
  const { view, studySteps, lessonTypes } = useClassesSettings()

  const summaries = useMemo(
    () => classes.map(cls => classSummary({ cls, events, record: lessons?.[cls.id], today, nowTime, studyTypes: studySteps })),
    [classes, events, lessons, today, nowTime, studySteps],
  )
  const selected = view === 'overview' ? summaries.find(summary => summary.cls.id === selectedId) ?? null : null

  return (
    <div className="h-tab-pane overflow-y-auto">
      <div className={cn('mx-auto px-4 pt-6 pb-10 md:px-6', view === 'table' ? 'max-w-6xl' : 'max-w-2xl')}>
        {classes.length === 0 && (
          <EmptyState icon={BookOpen} title={t.classesPanelEmpty} description={t.classesPanelEmptyDesc} />
        )}
        {classes.length > 0 && view === 'table' && (
          <ClassesTable t={t} summaries={summaries} studySteps={studySteps} lessonTypes={lessonTypes} today={today} />
        )}
        {classes.length > 0 && view === 'overview' && !selected && (
          <ClassesOverview t={t} summaries={summaries} onOpen={setSelectedId} />
        )}
        {selected && (
          <ClassDetail key={selected.cls.id} t={t} summary={selected} lessonTypes={lessonTypes} today={today} onBack={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  )
}
