import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { eiCalendarApp } from '@/apps/eiCalendar'

export function EICalendarAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? {}
  const updateSettings = useStore(s => s.updateSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const [confirmOff, setConfirmOff] = useState(false)
  const enabled = apps.eiCalendar !== false

  const toggle = v => {
    if (!v) { setConfirmOff(true); return }
    updateSettings({ apps: { ...apps, eiCalendar: true } })
  }
  const disable = () => {
    wipeAppData(eiCalendarApp.wipe)
    updateSettings({ apps: { ...apps, eiCalendar: false } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.eiCalendar}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t.eiCalendarEnable}</p>
            <p className="text-xs text-muted-foreground">{t.eiCalendarEnableDesc}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={toggle} />
        </div>
        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.eiCalendarDisableTitle} description={t.eiCalendarDisableDesc} onConfirm={disable} />
      </DialogContent>
    </Dialog>
  )
}
