import { fmtDuration, getPomodoroCompletedCount, getPomodoroFocusSecs, getPeriodPomodoros } from './utils'

export function PomodoroPeriodBadge({ pomodoros, period, lang, t, onClick }) {
  const cur = getPeriodPomodoros(pomodoros, period)
  const completedCount = cur.reduce((s, p) => s + getPomodoroCompletedCount(p), 0)
  const focusSecs = cur.reduce((s, p) => s + getPomodoroFocusSecs(p), 0)

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg px-2 py-1"
    >
      <span>{t.pomodoroTotal}: {completedCount}</span>
      <span>|</span>
      <span>{t.pomodoroTotalTimeLabel}: {fmtDuration(focusSecs)}</span>
    </button>
  )
}
