import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { planPomodoroRecovery, recoveryIntervalSecs } from '@/lib/focus/pomodoroRecovery'
import { getPeriodPomodoros } from '@/components/focus/pomodoro/utils'

const PREVIEW_OPTIONS = { makeId: () => '', random: () => 0 }

export function PomodoroRecoverPanel({ t }) {
  const pomodoros = useStore(s => s.pomodoros)
  const period = useStore(s => s.settings?.pomodoro?.resetPeriod ?? 'week')
  const focus = useStore(s => s.settings?.focus)
  const recoverPomodoros = useStore(s => s.recoverPomodoros)

  const addedCount = useMemo(() => {
    const periodEntries = getPeriodPomodoros(pomodoros ?? [], period)
    return planPomodoroRecovery(periodEntries, recoveryIntervalSecs(focus), PREVIEW_OPTIONS).summary.addedCount
  }, [pomodoros, period, focus])

  return (
    <div className="py-3">
      <Button type="button" size="sm" variant="outline" className="w-full gap-2"
        disabled={addedCount === 0} onClick={recoverPomodoros}>
        <RotateCcw className="h-3.5 w-3.5" />
        {addedCount > 0 ? t.pomodoroRecoverAction(addedCount) : t.pomodoroRecoverNothing}
      </Button>
    </div>
  )
}
