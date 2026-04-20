import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useFocusClock } from './useFocusClock'
import { PomodoroLayer } from './PomodoroLayer'
import { defaultFocus } from './focusTab/constants'
import { fmtMins, fmtTimer } from './focusTab/formatters'
import { CenterPomodoro } from './focusTab/CenterPomodoro'
import { FocusWheel } from './focusTab/FocusWheel'
import { FocusSettingsPanel } from './focusTab/FocusSettingsPanel'
import { triggerFocusAlert } from './focusAlerts'
import { growthFromSecs, sizeFromPct } from './pomodoro/utils'

export function FocusTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const focus = useStore(s => s.settings?.focus ?? defaultFocus)
  const pomodoroEnabled = useStore(s => s.settings?.pomodoro?.enabled ?? false)
  const focusAlertMode = useStore(s => s.settings?.focusAlertMode ?? 'none')
  const updateFocusSettings = useStore(s => s.updateFocusSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [newTimeH, setNewTimeH] = useState(16)
  const [newTimeM, setNewTimeM] = useState(30)
  const [resetSignal, setResetSignal] = useState(null)
  const [smoothGrowth, setSmoothGrowth] = useState(0)
  const [growingFace, setGrowingFace] = useState(() => Math.floor(Math.random() * 5))
  const prevPhaseRef = useRef('focus')
  const prevPomodoroPhaseRef = useRef('focus')
  const containerRef = useRef(null)

  const { running, phase, cycleElapsed, totalElapsed, breakSecsLeft, secsToNextBreak, activeBreakSource,
    start, pause, resume, reset, skipBreak, nextScheduled } = useFocusClock({
    useInterval: focus.useInterval,
    intervalMins: focus.intervalMins,
    intervalBreakMins: focus.intervalBreakMins,
    useScheduled: focus.useScheduled,
    scheduledBreakMins: focus.scheduledBreakMins,
    scheduledTimes: focus.scheduledTimes,
  })

  const isBreak = phase === 'break'
  const phrase = running
    ? t.focusPhrases[Math.floor(totalElapsed / 30) % t.focusPhrases.length]
    : t.focusReady

  const breakDenom = activeBreakSource === 'interval'
    ? focus.intervalBreakMins * 60
    : focus.scheduledBreakMins * 60

  const focusPct = focus.useInterval
    ? cycleElapsed / (focus.intervalMins * 60)
    : secsToNextBreak && secsToNextBreak > 0
      ? cycleElapsed / secsToNextBreak
      : 0

  const ringPct = isBreak ? 1 - breakSecsLeft / breakDenom : focusPct
  const centerUnits = growthFromSecs(cycleElapsed)

  const growthNorm = 1 - Math.exp(-Math.max(0, cycleElapsed) / (10 * 60))
  const centerSize = sizeFromPct(centerUnits)

  const activeFocusText = (focus.focusLabel ?? '').trim() || phrase
  const displayBreakLabel = (focus.breakLabel ?? '').trim() || (lang === 'pt' ? 'momento pomodoro' : 'pomodoro time')

  const handleReset = () => {
    setResetSignal({
      ts: Date.now(),
      phase,
      cycleElapsed,
    })
    reset()
  }

  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    if (running && prevPhase !== phase) {
      triggerFocusAlert({ mode: focusAlertMode, phase, lang })
    }
    prevPhaseRef.current = phase
  }, [phase, running, focusAlertMode, lang])

  useEffect(() => {
    const prev = prevPomodoroPhaseRef.current
    if (prev === 'break' && phase === 'focus') {
      setGrowingFace(Math.floor(Math.random() * 5))
    }
    prevPomodoroPhaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase !== 'focus') {
      setSmoothGrowth(0)
      return
    }

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

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div ref={containerRef} className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 select-none overflow-hidden">
        {pomodoroEnabled && (
          <PomodoroLayer
            containerRef={containerRef}
            focusRunning={running}
            phase={phase}
            cycleElapsed={cycleElapsed}
            resetSignal={resetSignal}
          />
        )}

        <FocusWheel pct={ringPct} isBreak={isBreak}
          label={isBreak ? fmtTimer(breakSecsLeft) : fmtTimer(totalElapsed)}
          centerOverlay={pomodoroEnabled && phase === 'focus' && (running || cycleElapsed > 0)
            ? <CenterPomodoro
                pct={Math.min(1, Math.max(0, focusPct))}
                growth={smoothGrowth}
                faceIdx={growingFace}
                size={centerSize}
              />
            : null}
          sublabel={isBreak ? displayBreakLabel : running ? activeFocusText : t.focusReady} />

        <div className="relative z-20 flex items-center gap-3">
          {!running && totalElapsed === 0 && !isBreak && (
            <Button onClick={start} className="w-28">{t.focusStart}</Button>
          )}
          {running && !isBreak && (
            <Button variant="outline" onClick={pause} className="w-28">{t.focusPause}</Button>
          )}
          {!running && totalElapsed > 0 && !isBreak && (
            <>
              <Button onClick={resume} className="w-28">{t.focusResume}</Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>{t.focusReset}</Button>
            </>
          )}
          {isBreak && (
            <Button variant="outline" onClick={skipBreak}>{t.focusSkipBreak}</Button>
          )}
        </div>

        {focus.useScheduled && nextScheduled !== null && !isBreak && (
          <p className="relative z-20 text-xs text-muted-foreground">
            {t.focusNextBreak} {fmtMins(nextScheduled)}
          </p>
        )}

        <button onClick={() => setShowSettings(v => !v)}
          className="relative z-20 text-muted-foreground hover:text-foreground transition-colors">
          <SlidersHorizontal className="h-4 w-4" />
        </button>

        {showSettings && (
          <FocusSettingsPanel
            t={t}
            lang={lang}
            focus={focus}
            newTimeH={newTimeH}
            newTimeM={newTimeM}
            setNewTimeH={setNewTimeH}
            setNewTimeM={setNewTimeM}
            updateFocusSettings={updateFocusSettings}
          />
        )}
      </div>
    </div>
  )
}
