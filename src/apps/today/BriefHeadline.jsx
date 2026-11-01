import { ChevronRight, Coffee } from 'lucide-react'
import { GlassPanel } from '@/components/common/GlassPanel'
import { cn } from '@/lib/utils'
import { briefText } from './briefVisuals'
import { HIGHLIGHT_KINDS, countdownLabel, highlightContext, highlightKindLabel, highlightTab } from './highlightLabels'

function CountdownFigure({ t, daysLeft }) {
  if (daysLeft === 0) return <p className="text-2xl font-semibold tracking-tight">{t.todayDueToday}</p>
  return (
    <>
      <p className="text-4xl font-semibold leading-none tracking-tight tabular-nums">{daysLeft}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{countdownLabel(t, daysLeft)}</p>
    </>
  )
}

function DuePill({ t, daysLeft }) {
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
      daysLeft === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
      {daysLeft === 0 ? t.todayDueToday : t.todayInDays(daysLeft)}
    </span>
  )
}

function KindLabel({ t, item }) {
  return <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{highlightKindLabel(t, item)}</p>
}

function HighlightDetails({ item, studyLabel }) {
  const context = highlightContext(item)
  return (
    <>
      <p className="mt-0.5 line-clamp-2 font-medium leading-snug">{item.title}</p>
      {context && <p className="truncate text-xs text-muted-foreground">{context}</p>}
      {studyLabel && <p className="mt-1 truncate text-xs font-medium text-primary">{studyLabel}</p>}
    </>
  )
}

function WideHighlight({ t, item, studyLabel }) {
  return (
    <>
      <div className="w-20 shrink-0 text-center">
        <CountdownFigure t={t} daysLeft={item.daysLeft} />
      </div>
      <div className="min-w-0 flex-1">
        <KindLabel t={t} item={item} />
        <HighlightDetails item={item} studyLabel={studyLabel} />
      </div>
    </>
  )
}

function CompactHighlight({ t, item, studyLabel }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <KindLabel t={t} item={item} />
        <DuePill t={t} daysLeft={item.daysLeft} />
      </div>
      <HighlightDetails item={item} studyLabel={studyLabel} />
    </div>
  )
}

function RestBody({ t, item }) {
  return (
    <>
      <Coffee className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <p className="flex-1 text-sm leading-relaxed">{briefText(t, item)}</p>
    </>
  )
}

function headlineTarget(t, item, classesPanelEnabled) {
  if (item.study && classesPanelEnabled) return { tab: 'classesPanel', studyLabel: t.todayStudyAction(item.study.className) }
  return { tab: highlightTab(item), studyLabel: null }
}

export function BriefHeadline({ t, item, compact = false, classesPanelEnabled, onNavigate }) {
  const isHighlight = HIGHLIGHT_KINDS.includes(item.kind)
  if (!isHighlight) {
    return (
      <GlassPanel className="flex items-center gap-3 p-4">
        <RestBody t={t} item={item} />
      </GlassPanel>
    )
  }
  const { tab, studyLabel } = headlineTarget(t, item, classesPanelEnabled)
  return (
    <GlassPanel className="transition-colors hover:bg-accent/40">
      <button type="button" onClick={() => onNavigate(tab)} className={cn('flex h-full w-full gap-3 p-4 text-left', compact ? 'items-start' : 'items-center')}>
        {compact
          ? <CompactHighlight t={t} item={item} studyLabel={studyLabel} />
          : <WideHighlight t={t} item={item} studyLabel={studyLabel} />}
        {!compact && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
      </button>
    </GlassPanel>
  )
}
