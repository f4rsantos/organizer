import { GlassPanel } from '@/components/common/GlassPanel'
import { cn } from '@/lib/utils'
import { Coffee } from 'lucide-react'
import { briefText } from './briefVisuals'
import { CardAction } from './CardAction'
import { HIGHLIGHT_KINDS, countdownLabel, highlightContext, highlightKindLabel, highlightTab } from './highlightLabels'

const TAB_LABEL_KEYS = { calendar: 'calendar', tasks: 'tasks', kanban: 'kanban', classesPanel: 'classesPanel' }

function CountdownFigure({ t, daysLeft }) {
  if (daysLeft === 0) return <p className="text-4xl font-semibold tracking-tight">{t.todayDueToday}</p>
  return (
    <>
      <p className="text-6xl font-semibold tracking-tight tabular-nums">{daysLeft}</p>
      <p className="mt-2 text-xs text-muted-foreground">{countdownLabel(t, daysLeft)}</p>
    </>
  )
}

function HighlightText({ item, compact }) {
  const context = highlightContext(item)
  return (
    <>
      <p className={cn('font-medium leading-snug', compact ? 'text-base' : 'text-lg')}>{item.title}</p>
      {context && <p className="mt-0.5 truncate text-sm text-muted-foreground">{context}</p>}
    </>
  )
}

function KindLabel({ t, item }) {
  return <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{highlightKindLabel(t, item)}</p>
}

function Countdown({ t, item }) {
  return (
    <div className="flex items-start gap-5">
      <div className="shrink-0 text-center leading-none">
        <CountdownFigure t={t} daysLeft={item.daysLeft} />
      </div>
      <div className="min-w-0 flex-1 space-y-1 pt-1">
        <KindLabel t={t} item={item} />
        <HighlightText item={item} />
      </div>
    </div>
  )
}

function CompactHighlight({ t, item }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <KindLabel t={t} item={item} />
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
          item.daysLeft === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
          {item.daysLeft === 0 ? t.todayDueToday : t.todayInDays(item.daysLeft)}
        </span>
      </div>
      <HighlightText item={item} compact />
    </div>
  )
}

function RestMessage({ t, item, compact }) {
  return (
    <div className="space-y-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Coffee className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <p className={cn('font-medium leading-snug tracking-tight', compact ? 'text-base' : 'text-xl')}>{briefText(t, item)}</p>
    </div>
  )
}

function headlineAction(t, item, classesPanelEnabled) {
  if (item.study && classesPanelEnabled) return { label: t.todayStudyAction(item.study.className), tab: 'classesPanel' }
  const tab = highlightTab(item)
  return tab ? { label: t[TAB_LABEL_KEYS[tab]], tab } : null
}

function HighlightBody({ t, item, compact }) {
  return compact ? <CompactHighlight t={t} item={item} /> : <Countdown t={t} item={item} />
}

export function BriefHeadline({ t, item, compact = false, classesPanelEnabled, onNavigate }) {
  const isHighlight = HIGHLIGHT_KINDS.includes(item.kind)
  const action = headlineAction(t, item, classesPanelEnabled)
  return (
    <GlassPanel className="flex flex-col p-5">
      <div className="flex-1">
        {isHighlight ? <HighlightBody t={t} item={item} compact={compact} /> : <RestMessage t={t} item={item} compact={compact} />}
      </div>
      {action && <CardAction label={action.label} onClick={() => onNavigate(action.tab)} />}
    </GlassPanel>
  )
}
