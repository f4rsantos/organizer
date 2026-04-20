import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { PomodoroStatsModal } from './pomodoro/PomodoroStatsModal'
import { PomodoroPeriodBadge } from './pomodoro/PomodoroPeriodBadge'
import { TomatoCircle } from './pomodoro/TomatoCircle'
import { getPeriodPomodoros, TOMATO_RADIUS } from './pomodoro/utils'
import { usePomodoroBodies } from './pomodoro/usePomodoroBodies'

export function PomodoroLayer({ containerRef, focusRunning, phase, cycleElapsed, resetSignal }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const pomodoros = useStore(s => s.pomodoros ?? [])
  const addPomodoro = useStore(s => s.addPomodoro)
  const pomodoroSettings = useStore(s => s.settings?.pomodoro ?? {})
  const { enabled = false, resetPeriod = 'week', trackStats = false, showAbandoned = true, showPeriodStats = true } = pomodoroSettings

  const [showStats, setShowStats] = useState(false)
  const { bodies, handlePointerStart } = usePomodoroBodies({
    containerRef,
    pomodoros,
    addPomodoro,
    trackStats,
    phase,
    cycleElapsed,
    focusRunning,
    resetSignal,
  })

  const visibleBodies = showAbandoned ? bodies : bodies.filter(b => !b.abandoned)
  const periodPomodoros = getPeriodPomodoros(pomodoros, resetPeriod)
  const periodIds = useMemo(() => new Set(periodPomodoros.map(p => String(p.id))), [periodPomodoros])
  const renderedBodies = showPeriodStats
    ? visibleBodies.filter(b => periodIds.has(String(b.id)))
    : visibleBodies

  return (
    <>
      {showStats && (
        <PomodoroStatsModal
          pomodoros={pomodoros}
          period={resetPeriod}
          t={t}
          lang={lang}
          trackStats={trackStats}
          onClose={() => setShowStats(false)}
        />
      )}

      {enabled && showPeriodStats && (
        <div className="flex justify-center pt-1">
          <PomodoroPeriodBadge pomodoros={pomodoros} period={resetPeriod} lang={lang} t={t} onClick={() => setShowStats(true)} />
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {renderedBodies.map(b => (
          <div key={b.id}
            onPointerDown={e => handlePointerStart(b.id, e)}
            style={{
              position: 'absolute',
              left: b.x - (b.radius ?? TOMATO_RADIUS),
              top: b.y - (b.radius ?? TOMATO_RADIUS),
              pointerEvents: 'auto',
              cursor: 'grab',
              touchAction: 'none',
              opacity: b.abandoned ? 0.55 : 1,
              transform: `rotate(${b.rotation ?? 0}deg)`,
            }}>
            <TomatoCircle pct={b.colorPct ?? (b.abandoned ? b.pct : 1)} faceIdx={b.face} size={b.size ?? TOMATO_RADIUS * 2} />
          </div>
        ))}
      </div>
    </>
  )
}
