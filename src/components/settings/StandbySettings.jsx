import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SettingList, SettingSelect } from './SettingRow'

const PANE_KEYS = {
  wheel: 'paneWheel', 'wheel-time': 'paneWheelTime', calendar: 'paneCalendar',
  focus: 'paneFocus', kanban: 'paneKanban', 'tasks-by-category': 'paneTasksByCategory',
}

const DEFAULT_STANDBY = { enabled: false, panelCount: 3, panes: ['wheel-time', 'calendar', 'tasks-by-category'] }

const NONE_VALUE = '__none__'

function PaneSelect({ label, value, onChange, t, allowNone }) {
  const paneItems = Object.entries(PANE_KEYS).map(([id, key]) => ({ value: id, label: t[key] }))
  const items = allowNone ? [{ value: NONE_VALUE, label: t.standbyPaneNone }, ...paneItems] : paneItems
  const selected = allowNone && !value ? NONE_VALUE : value
  const handle = v => onChange(v === NONE_VALUE ? '' : v)
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={selected} onValueChange={handle} items={items}>
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
  const panes = standby.panes ?? DEFAULT_STANDBY.panes
  const panelCount = standby.panelCount ?? 3
  const save = patch => updateSettings({ standby: { ...standby, panes, panelCount, ...patch } })

  const firstOf = entry => (Array.isArray(entry) ? entry[0] : entry) ?? 'wheel-time'
  const secondOf = entry => (Array.isArray(entry) ? (entry[1] ?? '') : '')

  const setFirstPane = (i, v) => {
    const next = [...panes]
    const second = secondOf(next[i])
    next[i] = second ? [v, second] : v
    save({ panes: next })
  }

  const setSecondPane = (i, v) => {
    const next = [...panes]
    const first = firstOf(next[i])
    next[i] = v ? [first, v] : first
    save({ panes: next })
  }

  const countItems = [1, 2, 3].map(n => ({ value: String(n), label: String(n) }))

  return (
    <SettingList>
      <SettingSelect label={t.standbyPanels} value={String(panelCount)}
        onChange={v => save({ panelCount: Number(v) })} options={countItems} />
      {Array.from({ length: panelCount }, (_, i) => (
        <div key={i} className="space-y-2 py-3">
          <PaneSelect label={t.standbyPane(i + 1)} value={firstOf(panes[i])} onChange={v => setFirstPane(i, v)} t={t} />
          <PaneSelect label={t.standbyPaneSecond} value={secondOf(panes[i])} onChange={v => setSecondPane(i, v)} t={t} allowNone />
        </div>
      ))}
    </SettingList>
  )
}
