import { useLayoutEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  fmtDuration,
  getPomodoroAbandonedCount,
  getPomodoroCompletedCount,
  getPomodoroFocusSecs,
  getPomodoroTimestamp,
  getPeriodPomodoros,
  getPrevPeriodPomodoros,
  isPomodoroAggregate,
  startOfWeekLocal,
} from './utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

const CHART_BAR_COLOR = '#ef4444'

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function daySpanForPeriod(period, entries) {
  const now = new Date()
  if (period === 'week') return 7
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return Math.max(1, Math.round((now - start) / 86400000) + 1)
  }
  const first = entries.length ? entries.reduce((min, p) => Math.min(min, getPomodoroTimestamp(p) || Date.now()), Infinity) : Date.now()
  return Math.max(1, Math.round((Date.now() - startOfDay(first)) / 86400000) + 1)
}

function WeeklyFocusInsights({ history, periodEntries, curFocus, period, lang, t }) {
  const timelineHistory = history.filter(p => !isPomodoroAggregate(p))
  const aggregateFocus = history
    .filter(isPomodoroAggregate)
    .reduce((s, p) => s + getPomodoroFocusSecs(p), 0)
  const chartWrapRef = useRef(null)
  const [chartWidth, setChartWidth] = useState(320)
  const chartHeight = 120

  useLayoutEffect(() => {
    const node = chartWrapRef.current
    if (!node) return

    const update = () => {
      const nextWidth = Math.max(220, Math.floor(node.clientWidth || 0))
      setChartWidth(nextWidth)
    }

    update()

    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update)
      ro.observe(node)
    } else {
      window.addEventListener('resize', update)
    }

    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', update)
    }
  }, [])

  const isPt = lang === 'pt'
  const title = t.pomodoroInsightsDailyTitle
  const weeklyBreakdownTitle = t.pomodoroInsightsWeeklyBreakdownTitle
  const avgWeekLabel = t.pomodoroInsightsAvgWeekLabel
  const avgPeriodLabel = t.pomodoroInsightsAvgPeriodLabel

  const now = Date.now()
  const dayLabels = t.pomodoroInsightsDayLabels ?? ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const byWeek = new Map()
  timelineHistory.forEach(p => {
    const ts = getPomodoroTimestamp(p)
    const w = startOfWeekLocal(ts > 0 ? ts : now)
    const prev = byWeek.get(w) ?? 0
    byWeek.set(w, prev + getPomodoroFocusSecs(p))
  })

  if (timelineHistory.length === 0 && aggregateFocus > 0) {
    const w = startOfWeekLocal(now)
    byWeek.set(w, (byWeek.get(w) ?? 0) + aggregateFocus)
  }

  const sortedWeeks = [...byWeek.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[0] - a[0])

  const chartWeekStart = sortedWeeks[0]?.[0] ?? startOfWeekLocal(now)
  
  const weekDaily = Array.from({ length: 7 }, (_, i) => ({
    dayTs: chartWeekStart + i * 86400000,
    secs: 0,
  }))

  timelineHistory.forEach(p => {
    const ts = getPomodoroTimestamp(p)
    const dayTs = startOfDay(ts > 0 ? ts : now)
    const idx = Math.round((dayTs - chartWeekStart) / 86400000)
    if (idx >= 0 && idx < 7) weekDaily[idx].secs += getPomodoroFocusSecs(p)
  })

  if (timelineHistory.length === 0 && aggregateFocus > 0) {
    const dayIdx = Math.round((startOfDay(now) - chartWeekStart) / 86400000)
    if (dayIdx >= 0 && dayIdx < 7) {
      weekDaily[dayIdx].secs += aggregateFocus
    }
  }

  const chartData = weekDaily.map((d, idx) => ({
    day: dayLabels[idx],
    secs: d.secs,
    formatted: fmtDuration(d.secs)
  }))

  const thisWeekTotal = weekDaily.reduce((s, d) => s + d.secs, 0)
  const avgWeekDaySecs = Math.round(thisWeekTotal / 7)

  const weeklyRows = sortedWeeks
    .slice(0, 6)
    .map(([weekTs, totalSecs]) => ({
      weekTs,
      totalSecs,
      avgDaySecs: Math.round(totalSecs / 7),
    }))

  const periodDays = daySpanForPeriod(period, periodEntries)
  const avgPeriodDaySecs = Math.round(curFocus / periodDays)

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 pb-5 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>

      <div ref={chartWrapRef} className="h-32 w-full pt-2 pb-4 min-h-[128px]">
        <BarChart width={chartWidth} height={chartHeight} data={chartData}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              dy={10}
            />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              cursor={{ fill: 'var(--secondary)', radius: 4 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border/50 bg-background px-2 py-1.5 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {payload[0].payload.day}
                        </span>
                        <span className="text-xs font-bold text-foreground tabular-nums">
                          {payload[0].payload.formatted}
                        </span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar 
              dataKey="secs" 
              radius={[4, 4, 0, 0]} 
              minPointSize={6} 
              fill={CHART_BAR_COLOR} 
              fillOpacity={0.95} 
              isAnimationActive={false}
            />
          </BarChart>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-y-2 text-xs text-muted-foreground">
        <span>{avgWeekLabel}</span>
        <span className="font-medium tabular-nums text-foreground">{fmtDuration(avgWeekDaySecs)}</span>
        {period !== 'week' && (
          <>
            <span>{avgPeriodLabel}</span>
            <span className="font-medium tabular-nums text-foreground">{fmtDuration(avgPeriodDaySecs)}</span>
          </>
        )}
      </div>

      <div className="border-t border-border/60 pt-2 space-y-1.5">
        <p className="text-xs text-muted-foreground">{weeklyBreakdownTitle}</p>
        {weeklyRows.length > 0 ? (
          weeklyRows.map(w => (
            <div key={w.weekTs} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center">
              <span className="text-muted-foreground">
                {new Intl.DateTimeFormat(isPt ? 'pt-PT' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(w.weekTs))}
              </span>
              <span className="tabular-nums text-foreground">{fmtDuration(w.totalSecs)}</span>
              <span className="tabular-nums text-muted-foreground">{fmtDuration(w.avgDaySecs)}{t.pomodoroInsightsPerDaySuffix}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">{t.pomodoroInsightsNoWeeklyData}</p>
        )}
      </div>
    </section>
  )
}

export function PomodoroStatsModal({ pomodoros, period, t, onClose, lang = 'en', trackStats = false }) {
  const all = pomodoros
  const cur = getPeriodPomodoros(pomodoros, period)
  const prev = getPrevPeriodPomodoros(pomodoros, period)

  const curCompletedCount = cur.reduce((s, p) => s + getPomodoroCompletedCount(p), 0)
  const curAbandonedCount = cur.reduce((s, p) => s + getPomodoroAbandonedCount(p), 0)
  const prevCompletedCount = prev.reduce((s, p) => s + getPomodoroCompletedCount(p), 0)
  const curFocus = cur.reduce((s, p) => s + getPomodoroFocusSecs(p), 0)
  const prevFocus = prev.reduce((s, p) => s + getPomodoroFocusSecs(p), 0)
  const allCompletedCount = all.reduce((s, p) => s + getPomodoroCompletedCount(p), 0)
  const allAbandonedCount = all.reduce((s, p) => s + getPomodoroAbandonedCount(p), 0)
  const allFocus = all.reduce((s, p) => s + getPomodoroFocusSecs(p), 0)

  const delta = (curVal, prevVal) => {
    const d = curVal - prevVal
    if (d === 0) return null
    return d > 0 ? `+${d}` : `${d}`
  }

  const completedDelta = prev.length > 0 ? delta(curCompletedCount, prevCompletedCount) : null
  const focusDelta = (prev.length > 0 && prevFocus > 0) ? delta(Math.round(curFocus / 60), Math.round(prevFocus / 60)) : null
  const showInsights = trackStats

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle>{t.pomodoroStatsTitle}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4 flex-1 overflow-y-auto">
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-secondary/25 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{t.pomodoroPeriodTotal}</p>
              <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm items-center">
                <span className="text-muted-foreground">{t.pomodoroTotal}</span>
                <span className="font-semibold tabular-nums">{curCompletedCount}</span>

                <span className="text-muted-foreground">{t.pomodoroAbandoned}</span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-500">{curAbandonedCount}</span>

                {trackStats && (
                  <>
                    <span className="text-muted-foreground">{t.pomodoroPeriodFocus}</span>
                    <span className="font-semibold tabular-nums">{fmtDuration(curFocus)}</span>
                  </>
                )}
              </div>

              {trackStats && (completedDelta || focusDelta) && (
                <div className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                  {completedDelta && <p>{t.pomodoroTotal}: {completedDelta} {t.pomodoroVsSinceLast}</p>}
                  {focusDelta && <p>{t.pomodoroPeriodFocus}: {focusDelta}m {t.pomodoroVsSinceLast}</p>}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{t.pomodoroAllTime}</p>
              <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm items-center">
                <span className="text-muted-foreground">{t.pomodoroTotal}</span>
                <span className="font-semibold tabular-nums">{allCompletedCount}</span>

                <span className="text-muted-foreground">{t.pomodoroAbandoned}</span>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-500">{allAbandonedCount}</span>

                {trackStats && (
                  <>
                    <span className="text-muted-foreground">{t.pomodoroFocusTime}</span>
                    <span className="font-semibold tabular-nums">{fmtDuration(allFocus)}</span>
                  </>
                )}
              </div>
            </div>
          </section>

          {showInsights && (
            <WeeklyFocusInsights 
              history={all}
              periodEntries={cur}
              curFocus={curFocus} 
              period={period} 
              lang={lang} 
              t={t}
            />
          )}
          <div className="h-2 shrink-0" />
        </div>
      </DialogContent>
    </Dialog>
  )
}