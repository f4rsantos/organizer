import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useFocusClock } from '../useFocusClock'
import { defaultFocus } from './constants'
import { useNotify } from '@/hooks/useNotify'
import { growthFromSecs, sizeFromPct } from '../pomodoro/utils'

export function useFocusPresentation() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const focus = useStore(s => s.settings?.focus ?? defaultFocus)
  const pomodoroEnabled = useStore(s => s.settings?.pomodoro?.enabled ?? false)
  const focusAlertsEnabled = useStore(s => s.settings?.focus?.alertsEnabled ?? true)
  const notify = useNotify()

  const resetSignal = useStore(s => s.resetSignal)
  const setResetSignal = useStore(s => s.setResetSignal)
  const [smoothGrowth, setSmoothGrowth] = useState(0)
  const [growingFace, setGrowingFace] = useState(() => Math.floor(Math.random() * 5))
  const [prevPomodoroPhase, setPrevPomodoroPhase] = useState('focus')
  const prevPhaseRef = useRef('focus')

  const clock = useFocusClock({
    useInterval: focus.useInterval,
    intervalMins: focus.intervalMins,
    intervalBreakMins: focus.intervalBreakMins,
    useScheduled: focus.useScheduled,
    scheduledBreakMins: focus.scheduledBreakMins,
    scheduledTimes: focus.scheduledTimes,
    intervalResetMode: focus.intervalResetMode ?? 'reset',
  })

  const { running, phase, cycleElapsed, totalElapsed, breakSecsLeft, scheduledPct, activeBreakSource, reset } = clock

  if (phase !== prevPomodoroPhase) {
    if (prevPomodoroPhase === 'break' && phase === 'focus') setGrowingFace(() => Math.floor(Math.random() * 5))
    if (phase !== 'focus') setSmoothGrowth(0)
    setPrevPomodoroPhase(phase)
  }

  const isBreak = phase === 'break'
  const phrase = running
    ? t.focusPhrases[Math.floor(totalElapsed / 30) % t.focusPhrases.length]
    : t.focusReady

  const breakDenom = activeBreakSource === 'interval'
    ? focus.intervalBreakMins * 60
    : focus.scheduledBreakMins * 60

  const focusPct = focus.useInterval
    ? cycleElapsed / (focus.intervalMins * 60)
    : Number.isFinite(scheduledPct)
      ? scheduledPct
      : 0

  const ringPct = isBreak ? 1 - breakSecsLeft / breakDenom : focusPct
  const centerUnits = growthFromSecs(cycleElapsed)
  const growthNorm = 1 - Math.exp(-Math.max(0, cycleElapsed) / (10 * 60))
  const centerSize = sizeFromPct(centerUnits)

  const activeFocusText = (focus.focusLabel ?? '').trim() || phrase
  const displayBreakLabel = (focus.breakLabel ?? '').trim() || (lang === 'pt' ? 'momento pomodoro' : 'pomodoro time')

  const handleReset = () => {
    setResetSignal({ ts: Date.now(), phase, cycleElapsed })
    reset()
  }

  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    if (running && prevPhase !== phase && focusAlertsEnabled) {
      notify({
        tag: 'organiser-focus-alert',
        title: t.focusNotifTitle,
        body: phase === 'break' ? t.focusNotifBreakBody : t.focusNotifFocusBody,
      }, { vibratePattern: phase === 'break' ? [22, 55, 22] : 24 })
    }
    prevPhaseRef.current = phase
  }, [phase, running, focusAlertsEnabled, notify, t])

  useEffect(() => {
    if (phase !== 'focus') return

    let raf = 0
    const animate = () => {
      setSmoothGrowth(prev => {
        const next = prev + (growthNorm - prev) * 0.14
        return Math.abs(next - growthNorm) < 0.0005 ? growthNorm : next
      })
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [growthNorm, phase])

  return {
    t,
    lang,
    focus,
    clock,
    pomodoroEnabled,
    resetSignal,
    smoothGrowth,
    growingFace,
    isBreak,
    ringPct,
    focusPct,
    centerSize,
    activeFocusText,
    displayBreakLabel,
    handleReset,
  }
}
