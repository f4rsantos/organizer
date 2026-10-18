import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { formatShortcut, shortcutFromEvent, defaultQuickActionShortcut } from '@/lib/shortcuts'
import { SettingList, SettingRow, SettingSelect, SettingToggle } from '../SettingRow'
import { cn } from '@/lib/utils'

function ShortcutField({ t, value, listening, onListen }) {
  return (
    <Input readOnly
      value={listening ? t.qaShortcutListening : formatShortcut(value)}
      placeholder={t.qaShortcutNone}
      onFocus={() => onListen(true)}
      onBlur={() => onListen(false)}
      className={cn('h-8 w-40 cursor-pointer text-center font-mono text-xs', listening && 'bg-primary/5 ring-2 ring-primary')} />
  )
}

export function QuickActionAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? {}
  const navbarSettings = useStore(s => s.settings?.navbar) ?? {}
  const updateSettings = useStore(s => s.updateSettings)

  const tripleTap = apps.quickActionTripleTap === true
  const shortcut = apps.quickActionShortcut === undefined ? defaultQuickActionShortcut() : apps.quickActionShortcut
  const navbarShortcut = apps.quickActionNavbarShortcut || null
  const showAddButton = navbarSettings.showAddButton === true
  const addAction = navbarSettings.addAction || 'task'
  const addButtonLabel = navbarSettings.addButtonLabel || ''

  const addActionOptions = [
    { value: 'task', label: t.task },
    { value: 'kanban', label: t.addCard },
    { value: 'event', label: t.addEvent },
    { value: 'note', label: t.notesNew },
    { value: 'picker', label: t.navAddPicker },
  ]

  const [listeningSpotlight, setListeningSpotlight] = useState(false)
  const [listeningNavbar, setListeningNavbar] = useState(false)

  const toggleTripleTap = v => updateSettings({ apps: { ...(useStore.getState().settings?.apps || {}), quickActionTripleTap: v } })
  const toggleShowAddButton = v => updateSettings({ navbar: { ...(useStore.getState().settings?.navbar || {}), showAddButton: v } })
  const setAddAction = v => updateSettings({ navbar: { ...(useStore.getState().settings?.navbar || {}), addAction: v } })
  const setAddButtonLabel = v => updateSettings({ navbar: { ...(useStore.getState().settings?.navbar || {}), addButtonLabel: v } })

  useEffect(() => {
    if (!listeningSpotlight && !listeningNavbar) return
    const onKeyDown = e => {
      e.preventDefault()
      e.stopPropagation()

      const isSpotlight = listeningSpotlight
      const targetKey = isSpotlight ? 'quickActionShortcut' : 'quickActionNavbarShortcut'

      if (e.key === 'Backspace' || e.key === 'Delete') {
        updateSettings({ apps: { ...(useStore.getState().settings?.apps || {}), [targetKey]: null } })
        setListeningSpotlight(false)
        setListeningNavbar(false)
        return
      }

      if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Dead'].includes(e.key)) return

      updateSettings({ apps: { ...(useStore.getState().settings?.apps || {}), [targetKey]: shortcutFromEvent(e) } })
      setListeningSpotlight(false)
      setListeningNavbar(false)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [listeningSpotlight, listeningNavbar, updateSettings])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.quickActionApp}</DialogTitle>
        </DialogHeader>
        <SettingList>
          <SettingRow label={t.quickActionShortcutEnable} control={
            <ShortcutField t={t} value={shortcut} listening={listeningSpotlight} onListen={setListeningSpotlight} />
          } />
          <SettingToggle label={t.quickActionTripleTapEnable} desc={t.quickActionTripleTapEnableDesc} checked={tripleTap} onChange={toggleTripleTap} />
          <SettingToggle label={t.navAddButton} checked={showAddButton} onChange={toggleShowAddButton}>
            {showAddButton && (
              <SettingList>
                <SettingSelect label={t.navAddAction} options={addActionOptions}
                  value={addActionOptions.some(o => o.value === addAction) ? addAction : 'task'} onChange={setAddAction} />
                <SettingRow label={t.navAddLabelField} control={
                  <Input value={addButtonLabel} onChange={e => setAddButtonLabel(e.target.value)}
                    placeholder={t.navAddLabelPlaceholder} className="h-8 w-40" />
                } />
                <SettingRow label={t.navAddShortcut} control={
                  <ShortcutField t={t} value={navbarShortcut} listening={listeningNavbar} onListen={setListeningNavbar} />
                } />
              </SettingList>
            )}
          </SettingToggle>
        </SettingList>
      </DialogContent>
    </Dialog>
  )
}
