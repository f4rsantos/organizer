import { Button } from '@/components/ui/button'
import { SettingList, SettingSelect, SettingToggle } from './SettingRow'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

const DEFAULT = { enabled: false, resetPeriod: 'week', trackStats: false, showAbandoned: true, showPeriodStats: true, showOverlay: false, requireFocusOnScreen: true }

export function PomodoroSettings() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const pom = useStore(s => s.settings?.pomodoro ?? DEFAULT)
  const updatePomodoroSettings = useStore(s => s.updatePomodoroSettings)
  const erasePomodoroStats = useStore(s => s.erasePomodoroStats)
  const requiresFocus = pom.requireFocusOnScreen !== false

  const periodOptions = [
    { value: 'day', label: t.pomodoroResetDay },
    { value: 'week', label: t.pomodoroResetWeek },
    { value: 'month', label: t.pomodoroResetMonth },
    { value: 'semester', label: t.pomodoroResetSemester },
  ]

  const toggle = (key) => {
    if (key === 'showPeriodStats') {
      const nextShow = !pom.showPeriodStats
      if (!nextShow && pom.trackStats) {
        updatePomodoroSettings({ showPeriodStats: nextShow, trackStats: false })
        return
      }
      updatePomodoroSettings({ showPeriodStats: nextShow })
      return
    }

    if (key === 'trackStats' && !pom.showPeriodStats) return

    updatePomodoroSettings({ [key]: !pom[key] })
  }

  return (
    <SettingList>
      <SettingSelect label={t.pomodoroResetPeriod} value={pom.resetPeriod ?? 'week'}
        onChange={v => updatePomodoroSettings({ resetPeriod: v })} options={periodOptions} />
      <SettingToggle label={t.pomodoroShowPeriodPomodoros} checked={Boolean(pom.showPeriodStats)} onChange={() => toggle('showPeriodStats')} />
      <SettingToggle label={t.pomodoroShowOverlay} checked={pom.showOverlay === true} onChange={() => toggle('showOverlay')} />
      {pom.showPeriodStats && (
        <SettingToggle label={t.pomodoroTrackPeriodStats} checked={Boolean(pom.trackStats)} onChange={() => toggle('trackStats')} />
      )}
      <SettingToggle label={t.pomodoroShowAbandoned} checked={Boolean(pom.showAbandoned)} onChange={() => toggle('showAbandoned')} />
      <SettingToggle label={t.pomodoroRequireFocus} checked={requiresFocus}
        onChange={() => updatePomodoroSettings({ requireFocusOnScreen: !requiresFocus })} />
      <div className="pt-3.5">
        <Button type="button" variant="ghost" size="sm"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => erasePomodoroStats()}>
          {t.pomodoroEraseStats}
        </Button>
      </div>
    </SettingList>
  )
}
