import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { planPomodoroRecovery, recoveryIntervalSecs } from '@/lib/focus/pomodoroRecovery'
import { fmtDuration, getPeriodPomodoros } from '@/components/focus/pomodoro/utils'

const PREVIEW_OPTIONS = { makeId: () => '', random: () => 0 }

function recoveryStatRows(t, summary) {
  return [
    [t.pomodoroRecoverStatHave, summary.have],
    [t.pomodoroRecoverStatShouldHave, summary.shouldHave],
    [t.pomodoroRecoverStatAverage, fmtDuration(summary.averageSecs)],
    [t.pomodoroRecoverStatSpent, fmtDuration(summary.spentSecs)],
    [t.pomodoroRecoverStatTomato, fmtDuration(summary.tomatoSecs)],
    [t.pomodoroRecoverStatMissing, fmtDuration(summary.missingSecs)],
    [t.pomodoroRecoverStatAdded, summary.addedCount],
  ]
}

function RecoveryStats({ t, summary }) {
  return (
    <div role="tooltip"
      className="pointer-events-none invisible absolute bottom-full left-0 right-0 z-20 mb-1 rounded-md border bg-popover p-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        {recoveryStatRows(t, summary).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-mono tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function PomodoroRecoverPanel({ t }) {
  const pomodoros = useStore(s => s.pomodoros)
  const period = useStore(s => s.settings?.pomodoro?.resetPeriod ?? 'week')
  const focus = useStore(s => s.settings?.focus)
  const recoverPomodoros = useStore(s => s.recoverPomodoros)

  const summary = useMemo(() => {
    const periodEntries = getPeriodPomodoros(pomodoros ?? [], period)
    return planPomodoroRecovery(periodEntries, recoveryIntervalSecs(focus), PREVIEW_OPTIONS).summary
  }, [pomodoros, period, focus])
  const addedCount = summary.addedCount

  return (
    <div className="group relative py-3" tabIndex={-1}>
      <RecoveryStats t={t} summary={summary} />
      <Button type="button" size="sm" variant="outline" className="w-full gap-2"
        disabled={addedCount === 0} onClick={recoverPomodoros}>
        <RotateCcw className="h-3.5 w-3.5" />
        {addedCount > 0 ? t.pomodoroRecoverAction(addedCount) : t.pomodoroRecoverNothing}
      </Button>
    </div>
  )
}
