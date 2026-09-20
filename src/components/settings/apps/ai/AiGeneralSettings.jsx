import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatShortcut, shortcutFromEvent } from '@/lib/shortcuts'
import { SLOT_ORDER, isSlotFilled } from './aiSlotHelpers'

const SLOT_LABEL_KEYS = { low: 'aiSlotLow', medium: 'aiSlotMedium', high: 'aiSlotHigh' }

export function AiGeneralSettings({ t, slots, autoMode, onAutoModeChange, defaultSlot, onDefaultSlotChange, shortcut, onShortcutChange }) {
  const [listening, setListening] = useState(false)
  const filledSlots = SLOT_ORDER.filter(name => isSlotFilled(slots[name]))

  useEffect(() => {
    if (!listening) return
    const onKeyDown = e => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Backspace' || e.key === 'Delete') {
        onShortcutChange(null)
        setListening(false)
        return
      }
      if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Dead'].includes(e.key)) return
      onShortcutChange(shortcutFromEvent(e))
      setListening(false)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [listening, onShortcutChange])

  return (
    <div className="space-y-4 border-t border-border/50 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t.aiAutoModeLabel}</p>
        <Switch checked={autoMode} onCheckedChange={onAutoModeChange} />
      </div>

      {filledSlots.length > 0 && (
        <div className="space-y-1.5">
          <Label>{t.aiDefaultModelLabel}</Label>
          <Select value={defaultSlot} onValueChange={onDefaultSlotChange}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {filledSlots.map(name => (
                <SelectItem key={name} value={name}>{slots[name]?.model || t[SLOT_LABEL_KEYS[name]]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t.aiShortcutLabel}</Label>
        <Input
          readOnly
          value={listening ? (t.aiShortcutListening ?? '') : formatShortcut(shortcut)}
          onFocus={() => setListening(true)}
          onBlur={() => setListening(false)}
          className={listening ? 'font-mono text-xs cursor-pointer ring-2 ring-primary bg-primary/5' : 'font-mono text-xs cursor-pointer'}
          placeholder={t.aiShortcutPlaceholder}
        />
      </div>
    </div>
  )
}
