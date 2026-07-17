import { useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { fmtMins, fmtTimer } from './focusTab/formatters'
import { CenterPomodoro } from './focusTab/CenterPomodoro'
import { FocusWheel } from './focusTab/FocusWheel'
import { FocusSettingsPanel } from './focusTab/FocusSettingsPanel'
import { PomodoroLayer } from './PomodoroLayer'
import { useFocusPresentation } from './focusTab/useFocusPresentation'

export function FocusTab() {
  const updateFocusSettings = useStore(s => s.updateFocusSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [newTimeH, setNewTimeH] = useState(16)
  const [newTimeM, setNewTimeM] = useState(30)
  const containerRef = useRef(null)

  const {
    t, lang, focus, clock, pomodoroEnabled, resetSignal, smoothGrowth, growingFace,
    isBreak, ringPct, focusPct, centerSize, activeFocusText, displayBreakLabel, handleReset,
  } = useFocusPresentation()

  const { running, phase, cycleElapsed, totalElapsed, breakSecsLeft, nextScheduled,
    start, pause, resume, skipBreak } = clock

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
