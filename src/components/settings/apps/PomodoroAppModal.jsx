import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { pomodoroApp } from '@/apps/pomodoro'
import { PomodoroSettings } from '../PomodoroSettings'

export function PomodoroAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const pomodoroEnabled = useStore(s => s.settings?.pomodoro?.enabled === true)
  const updatePomodoroSettings = useStore(s => s.updatePomodoroSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const [confirmOff, setConfirmOff] = useState(false)

  const toggle = v => {
    if (!v) { setConfirmOff(true); return }
    updatePomodoroSettings({ enabled: true })
  }
  const disable = () => {
    wipeAppData(pomodoroApp.wipe)
    updatePomodoroSettings({ enabled: false })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.pomodoro}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.pomodoro}</p>
              <p className="text-xs text-muted-foreground">{t.pomodoroModeDesc}</p>
            </div>
            <Switch checked={pomodoroEnabled} onCheckedChange={toggle} />
          </div>
          {pomodoroEnabled && (
            <div className="pt-1 border-t border-border/40">
              <PomodoroSettings />
            </div>
          )}
        </div>
        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.appDisableTitle} description={t.appDisableDesc} onConfirm={disable} />
      </DialogContent>
    </Dialog>
  )
}
