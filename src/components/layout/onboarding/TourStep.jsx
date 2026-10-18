import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { FREE_BOARD_ID } from '@/lib/taskUtils'
import { cn, sortByOrder } from '@/lib/utils'
import { TourScene } from './TourScene'
import { TasksPanel } from './TasksScene'
import { KanbanPanel } from './KanbanScene'
import { CalendarPanel } from './CalendarScene'
import { FocusPanel } from './FocusScene'
import { SettingsPanel } from './SettingsScene'
import { SharePanel } from './ShareScene'

function useTourLabels(t) {
  const workMode = useStore(s => s.settings?.workMode ?? false)
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const classes = useStore(s => s.classes)
  const kanban = useStore(s => s.kanban)

  return useMemo(() => {
    const scopeId = noneMode ? null : activeSemesterId
    const names = classes.filter(c => c.semesterId === scopeId).map(c => c.name).filter(Boolean)
    const generic = workMode ? t.group : t.class
    const groupLabels = names.length >= 2 ? names.slice(0, 2) : [names[0] ?? `${generic} A`, `${generic} B`]
    const cols = kanban?.[activeSemesterId ?? FREE_BOARD_ID]?.columns
    const columns = cols?.length ? sortByOrder(cols).map(c => c.title) : null
    return { groupLabels, columns }
  }, [classes, kanban, activeSemesterId, noneMode, workMode, t])
}

function TourPage({ page, t, labels }) {
  if (page === 0) return (
    <TourScene title={t.obInfoTasksTitle} desc={t.obInfoTasksDesc}>
      <TasksPanel groupLabels={labels.groupLabels} />
      <KanbanPanel columns={labels.columns} t={t} />
    </TourScene>
  )
  if (page === 1) return (
    <TourScene title={t.obInfoCalTitle} desc={t.obInfoCalDesc}>
      <CalendarPanel views={[t.viewDay, t.viewWeek, t.viewMonth, t.viewYear]} weekdays={t.weekdaysShort} />
      <FocusPanel labels={{
        ready: t.focusReady, focusing: t.focus, break: t.focusBreak,
        start: t.focusStart, pause: t.focusPause, reset: t.focusReset, skip: t.skip,
      }} />
    </TourScene>
  )
  return (
    <TourScene title={t.obInfoDoneTitle} desc={t.obInfoDoneDesc}>
      <SettingsPanel rows={[t.general, t.apps, t.data]} />
      <SharePanel labels={{ export: t.exportJson, import: t.importJson }} />
    </TourScene>
  )
}

const PAGE_COUNT = 3
const AUTO_ADVANCE_MS = 7000

export function TourStep({ t }) {
  const [page, setPage] = useState(0)
  const labels = useTourLabels(t)
  const move = delta => setPage(p => (p + delta + PAGE_COUNT) % PAGE_COUNT)

  useEffect(() => {
    const id = setTimeout(() => setPage(p => (p + 1) % PAGE_COUNT), AUTO_ADVANCE_MS)
    return () => clearTimeout(id)
  }, [page])

  return (
    <div className="flex flex-col items-center">
      <div key={page} className="w-full animate-in fade-in duration-300">
        <TourPage page={page} t={t} labels={labels} />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={() => move(-1)} aria-label={t.obBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: PAGE_COUNT }, (_, i) => (
          <button key={i} type="button" onClick={() => setPage(i)} aria-label={String(i + 1)}
            className={cn('h-1.5 rounded-full transition-all', i === page ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground')} />
        ))}
        <button type="button" onClick={() => move(1)} aria-label={t.obNext}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
