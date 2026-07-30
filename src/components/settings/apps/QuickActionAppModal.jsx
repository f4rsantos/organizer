import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

function formatShortcut(shortcut) {
  if (!shortcut || !shortcut.key) return ''
  const parts = []
  if (shortcut.ctrl) parts.push('Ctrl')
  if (shortcut.meta) parts.push('Cmd')
  if (shortcut.alt) parts.push('Alt')
  if (shortcut.shift) parts.push('Shift')
  parts.push(shortcut.key.toUpperCase())
  return parts.join(' + ')
}

export function QuickActionAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? {}
  const navbarSettings = useStore(s => s.settings?.navbar) ?? {}
  const updateSettings = useStore(s => s.updateSettings)

  const quickAction = apps.quickAction !== false
  const tripleTap = apps.quickActionTripleTap === true
  const shortcut = apps.quickActionShortcut === undefined ? { key: 'k', ctrl: true, meta: false, shift: false, alt: false } : apps.quickActionShortcut
  const navbarShortcut = apps.quickActionNavbarShortcut || null
  const showAddButton = navbarSettings.showAddButton === true
  const addAction = navbarSettings.addAction || 'task'
  const addButtonLabel = navbarSettings.addButtonLabel || ''

  const addActionOptions = [
    { value: 'task', label: t.task },
    { value: 'kanban', label: t.addCard },
    { value: 'event', label: t.addEvent },
    { value: 'note', label: t.notesNew || 'New Note' },
    { value: 'picker', label: t.navAddPicker || 'Ask each time' },
  ]

  const [listeningSpotlight, setListeningSpotlight] = useState(false)
  const [listeningNavbar, setListeningNavbar] = useState(false)

  const toggle = v => updateSettings({ apps: { ...(useStore.getState().settings?.apps || {}), quickAction: v } })
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

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

      const newShortcut = {
        key: e.key,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        alt: e.altKey,
        shift: e.shiftKey
      }
      updateSettings({ apps: { ...(useStore.getState().settings?.apps || {}), [targetKey]: newShortcut } })
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.quickActionAppEnable}</p>
              <p className="text-xs text-muted-foreground">{t.quickActionAppEnableDesc}</p>
            </div>
            <Switch checked={quickAction} onCheckedChange={toggle} />
          </div>

          {quickAction && (
            <div className="space-y-4 border-t border-border/50 pt-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">{t.quickActionShortcutEnable || 'Spotlight Shortcut'}</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={listeningSpotlight ? 'Press key combo or Backspace...' : formatShortcut(shortcut)}
                    onFocus={() => setListeningSpotlight(true)}
                    onBlur={() => setListeningSpotlight(false)}
                    className={`font-mono text-xs cursor-pointer ${listeningSpotlight ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    placeholder="Disabled (Click to set)"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.quickActionTripleTapEnable}</p>
                  <p className="text-xs text-muted-foreground">{t.quickActionTripleTapEnableDesc}</p>
                </div>
                <Switch checked={tripleTap} onCheckedChange={toggleTripleTap} />
              </div>
            </div>
          )}

          <div className="space-y-4 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.navAddButton || 'Show Navbar Add Button'}</p>
              <Switch checked={showAddButton} onCheckedChange={toggleShowAddButton} />
            </div>
            {showAddButton && (
              <>
                <div className="space-y-1.5">
                  <Label>{t.navAddAction || 'Add button action'}</Label>
                  <Select
                    value={addActionOptions.some(o => o.value === addAction) ? addAction : 'task'}
                    onValueChange={setAddAction}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {addActionOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Navbar Button Label (Optional)</Label>
                  <Input
                    value={addButtonLabel}
                    onChange={e => setAddButtonLabel(e.target.value)}
                    placeholder="Leave empty for default"
                  />
                </div>
                {quickAction && (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">Navbar Button Shortcut</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={listeningNavbar ? 'Press key combo or Backspace...' : formatShortcut(navbarShortcut)}
                        onFocus={() => setListeningNavbar(true)}
                        onBlur={() => setListeningNavbar(false)}
                        className={`font-mono text-xs cursor-pointer ${listeningNavbar ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                        placeholder="Disabled (Click to set)"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
