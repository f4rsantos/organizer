import { lazy, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { LazyBoundary } from '@/components/common/LazyBoundary'
import { PomodoroPeriodBadge } from '../pomodoro/PomodoroPeriodBadge'

const PomodoroStatsModal = lazy(() => import('../pomodoro/PomodoroStatsModal').then(m => ({ default: m.PomodoroStatsModal })))

export function FocusPomodoroStats() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const pomodoros = useStore(s => s.pomodoros ?? [])
  const pomodoroSettings = useStore(s => s.settings?.pomodoro ?? {})
  const { enabled = false, resetPeriod = 'week', trackStats = false, showPeriodStats = true } = pomodoroSettings

  const updateFocusSettings = useStore(s => s.updateFocusSettings)
  const showStatsModal = useStore(s => s.settings?.focus?.showStatsModal === true)
  const [localShowStats, setLocalShowStats] = useState(false)
  const [statsRetry, setStatsRetry] = useState(0)
  const showStats = showStatsModal || localShowStats

  return (
    <>
      {showStats && (
        <LazyBoundary
          retryKey={statsRetry}
          onRetry={() => setStatsRetry(n => n + 1)}
          errorLabel={t.chunkLoadError}
          retryLabel={t.chunkRetry}
        >
          <PomodoroStatsModal
            pomodoros={pomodoros}
            period={resetPeriod}
            t={t}
            lang={lang}
            trackStats={trackStats}
            onClose={() => { setLocalShowStats(false); updateFocusSettings({ showStatsModal: false }) }}
          />
        </LazyBoundary>
      )}

      {enabled && showPeriodStats && (
        <div className="flex justify-center pt-1">
          <PomodoroPeriodBadge
            pomodoros={pomodoros}
            period={resetPeriod}
            lang={lang}
            t={t}
            onClick={() => setLocalShowStats(true)}
          />
        </div>
      )}
    </>
  )
}
