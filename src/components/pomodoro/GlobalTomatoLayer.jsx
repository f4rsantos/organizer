import { useMemo, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { useFocusClock } from '@/components/focus/useFocusClock'
import { defaultFocus } from '@/components/focus/focusTab/constants'
import { TomatoCircle } from '@/components/focus/pomodoro/TomatoCircle'
import { getPeriodPomodoros, TOMATO_RADIUS } from '@/components/focus/pomodoro/utils'
import { usePomodoroBodies } from '@/components/focus/pomodoro/usePomodoroBodies'

function TomatoBodies({ containerRef, focusRunning, phase, cycleElapsed, resetSignal }) {
  const pomodoros = useStore(s => s.pomodoros ?? [])
  const addPomodoro = useStore(s => s.addPomodoro)
  const pomodoroSettings = useStore(s => s.settings?.pomodoro ?? {})
  const {
    trackStats = false,
    showAbandoned = true,
    showPeriodStats = true,
    resetPeriod = 'week',
  } = pomodoroSettings

  const periodPomodoros = useMemo(
    () => getPeriodPomodoros(pomodoros, resetPeriod),
    [pomodoros, resetPeriod],
  )
  const periodIds = useMemo(
    () => new Set(periodPomodoros.map(p => String(p.id))),
    [periodPomodoros],
  )

  const { bodies, handlePointerStart } = usePomodoroBodies({
    containerRef,
    pomodoros,
    addPomodoro,
    trackStats,
    phase,
    cycleElapsed,
    focusRunning,
    resetSignal,
    periodIds,
    showPeriodStats,
  })

  const renderedBodies = showAbandoned ? bodies : bodies.filter(b => !b.abandoned)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {renderedBodies.map(b => (
        <div
          key={b.id}
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
          }}
        >
          <TomatoCircle
            pct={b.colorPct ?? (b.abandoned ? b.pct : 1)}
            faceIdx={b.face}
            size={b.size ?? TOMATO_RADIUS * 2}
          />
        </div>
      ))}
    </div>
  )
}

export function GlobalTomatoLayer({ activeTab }) {
  const containerRef = useRef(null)
  const focus = useStore(s => s.settings?.focus ?? defaultFocus)
  const enabled = useStore(s => s.settings?.pomodoro?.enabled === true)
  const showOverlay = useStore(s => s.settings?.pomodoro?.showOverlay === true)
  const resetSignal = useStore(s => s.resetSignal)

  const { running, phase, cycleElapsed } = useFocusClock({
    useInterval: focus.useInterval,
    intervalMins: focus.intervalMins,
    intervalBreakMins: focus.intervalBreakMins,
    useScheduled: focus.useScheduled,
    scheduledBreakMins: focus.scheduledBreakMins,
    scheduledTimes: focus.scheduledTimes,
    intervalResetMode: focus.intervalResetMode ?? 'reset',
  })

  const visible = enabled && (activeTab === 'focus' || showOverlay)

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 30,
      }}
    >
      {visible && (
        <TomatoBodies
          containerRef={containerRef}
          focusRunning={running}
          phase={phase}
          cycleElapsed={cycleElapsed}
          resetSignal={resetSignal}
        />
      )}
    </div>
  )
}
