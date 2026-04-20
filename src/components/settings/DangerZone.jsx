import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function DangerZone({ semesterId }) {
  const [dialog, setDialog] = useState(null)
  const deleteSemester = useStore(s => s.deleteSemester)
  const clearPomodoros = useStore(s => s.clearPomodoros)
  const erasePomodoroStats = useStore(s => s.erasePomodoroStats)
  const pomodoroEnabled = useStore(s => s.settings?.pomodoro?.enabled ?? false)
  const pomodoroTrackStats = useStore(s => s.settings?.pomodoro?.trackStats ?? false)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 p-4">
      <p className="text-xs font-semibold text-destructive uppercase tracking-wider">{t.dangerZone}</p>
      {pomodoroEnabled && (
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => setDialog('pomodoros')}>
            {t.clearPomodoros}
          </Button>
          {pomodoroTrackStats && (
            <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setDialog('stats')}>
              {t.pomodoroEraseStats}
            </Button>
          )}
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
        onClick={() => setDialog('semester')}>
        {t.deleteSemester}
      </Button>

      <ConfirmDialog open={dialog === 'pomodoros'} onOpenChange={v => !v && setDialog(null)}
        title={t.clearPomodorosTitle} description={t.clearPomodorosDesc}
        onConfirm={() => clearPomodoros()} />

      <ConfirmDialog open={dialog === 'stats'} onOpenChange={v => !v && setDialog(null)}
        title={t.pomodoroEraseStatsTitle} description={t.pomodoroEraseStatsDesc}
        onConfirm={() => erasePomodoroStats()} />

      <ConfirmDialog open={dialog === 'semester'} onOpenChange={v => !v && setDialog(null)}
        title={t.deleteSemesterTitle} description={t.deleteSemesterDesc}
        onConfirm={() => deleteSemester(semesterId)} />
    </div>
  )
}
