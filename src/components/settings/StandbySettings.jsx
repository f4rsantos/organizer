import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { standbyApp } from '@/apps/standby'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PANE_KEYS = {
  wheel: 'paneWheel', 'wheel-time': 'paneWheelTime', calendar: 'paneCalendar',
  focus: 'paneFocus', kanban: 'paneKanban', 'tasks-by-category': 'paneTasksByCategory',
}

const DEFAULT_STANDBY = { enabled: false, panelCount: 3, panes: ['wheel-time', 'calendar', 'tasks-by-category'] }

function PaneSelect({ label, value, onChange, t }) {
  const items = Object.entries(PANE_KEYS).map(([id, key]) => ({ value: id, label: t[key] }))
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} items={items}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent position="popper">
          {items.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

export function StandbySettings() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const standby = useStore(s => s.settings?.standby) ?? DEFAULT_STANDBY
  const updateSettings = useStore(s => s.updateSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const [confirmOff, setConfirmOff] = useState(false)
  const panes = standby.panes ?? DEFAULT_STANDBY.panes
  const panelCount = standby.panelCount ?? 3
  const save = patch => updateSettings({ standby: { ...standby, panes, panelCount, ...patch } })

  const toggle = v => {
    if (!v) { setConfirmOff(true); return }
    save({ enabled: true })
  }
  const disable = () => wipeAppData(standbyApp.wipe)

  const setPane = (i, v) => {
    const next = [...panes]
    next[i] = v
    save({ panes: next })
  }

  const countItems = [1, 2, 3].map(n => ({ value: String(n), label: String(n) }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t.standbyEnable}</p>
          <p className="text-xs text-muted-foreground">{t.standbyDesc}</p>
        </div>
        <Switch checked={standby.enabled} onCheckedChange={toggle} />
      </div>
      <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
        title={t.appDisableTitle} description={t.appDisableDesc} onConfirm={disable} />
      {standby.enabled && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t.standbyPanels}</Label>
            <Select value={String(panelCount)} onValueChange={v => save({ panelCount: Number(v) })} items={countItems}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent position="popper">
                {countItems.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {Array.from({ length: panelCount }, (_, i) => (
            <PaneSelect key={i} label={t.standbyPane(i + 1)} value={panes[i] ?? 'wheel-time'} onChange={v => setPane(i, v)} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
