import { Circle, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

const DEFAULT = { enabled: false, resetPeriod: 'week', trackStats: false, showAbandoned: true, showPeriodStats: true }

export function PomodoroSettings() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const pom = useStore(s => s.settings?.pomodoro ?? DEFAULT)
  const updatePomodoroSettings = useStore(s => s.updatePomodoroSettings)
  const erasePomodoroStats = useStore(s => s.erasePomodoroStats)

  const periodOptions = [
    { value: 'day', label: t.pomodoroResetDay },
    { value: 'week', label: t.pomodoroResetWeek },
    { value: 'month', label: t.pomodoroResetMonth },
    { value: 'semester', label: t.pomodoroResetSemester },
  ]

  const toggle = (key) => {
    if (key === 'showPeriodStats') {
      const nextShow = !pom.showPeriodStats
      // One-way dependency: turning off period stats also disables tracking.
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
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t.pomodoroResetPeriod}</Label>
        <Select value={pom.resetPeriod ?? 'week'} onValueChange={v => updatePomodoroSettings({ resetPeriod: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {periodOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <button type="button" onClick={() => toggle('showPeriodStats')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {pom.showPeriodStats ? <CircleCheck className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
          {t.pomodoroShowPeriodPomodoros}
        </button>

        <button type="button" onClick={() => toggle('trackStats')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!pom.showPeriodStats}>
          {pom.trackStats ? <CircleCheck className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
          {t.pomodoroTrackPeriodStats}
        </button>

        <button type="button" onClick={() => toggle('showAbandoned')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          {pom.showAbandoned ? <CircleCheck className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
          {t.pomodoroShowAbandoned}
        </button>

        <Button type="button" variant="outline" size="sm"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => erasePomodoroStats()}>
          {t.pomodoroEraseStats}
        </Button>
      </div>
    </div>
  )
}
