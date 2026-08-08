import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { goalsApp } from '@/apps/goals'

export function GoalsAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? { goals: false }
  const updateSettings = useStore(s => s.updateSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const [confirmOff, setConfirmOff] = useState(false)

  const toggle = v => {
    if (!v) { setConfirmOff(true); return }
    updateSettings({ apps: { ...apps, goals: true } })
  }
  const disable = () => {
    wipeAppData(goalsApp.wipe)
    updateSettings({ apps: { ...apps, goals: false } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.goals}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.goalsEnable}</p>
              <p className="text-xs text-muted-foreground">{t.goalsEnableDesc}</p>
            </div>
            <Switch checked={apps.goals} onCheckedChange={toggle} />
          </div>
        </div>
        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.appDisableTitle} description={t.appDisableDesc} onConfirm={disable} />
      </DialogContent>
    </Dialog>
  )
}
