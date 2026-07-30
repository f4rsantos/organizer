import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ClassColorDot } from '@/components/settings/ClassColorDot'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { eisenhowerApp } from '@/apps/eisenhower'



const DEFAULT_QUADRANTS = [
  { id: 'urgent-important', labelKey: 'eisenhowerDoNow', dotColor: '#71717a' },
  { id: 'important', labelKey: 'eisenhowerSchedule', dotColor: '#a1a1aa' },
  { id: 'urgent', labelKey: 'eisenhowerDelegate', dotColor: '#a1a1aa' },
  { id: 'neither', labelKey: 'eisenhowerEliminate', dotColor: '#d4d4d8' },
]

export function EisenhowerAppModal({ open, onOpenChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const apps = useStore(s => s.settings?.apps) ?? { eisenhower: false, eisenhowerQuadrants: {} }
  const updateSettings = useStore(s => s.updateSettings)
  const wipeAppData = useStore(s => s.wipeAppData)
  const [confirmOff, setConfirmOff] = useState(false)

  const toggle = v => {
    if (!v) { setConfirmOff(true); return }
    updateSettings({ apps: { ...apps, eisenhower: true } })
  }
  const disable = () => {
    wipeAppData(eisenhowerApp.wipe)
    updateSettings({ apps: { ...apps, eisenhower: false } })
  }

  const custom = apps.eisenhowerQuadrants || {}

  const updateQuadrant = (id, updates) => {
    updateSettings({
      apps: {
        ...apps,
        eisenhowerQuadrants: { ...custom, [id]: { ...custom[id], ...updates } }
      }
    })
  }

  const resetDefaults = () => {
    updateSettings({ apps: { ...apps, eisenhowerQuadrants: {} } })
  }

  const handleColorChange = (id, hex) => {
    updateQuadrant(id, { tint: hex, dotColor: hex })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.eisenhower}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t.eisenhowerEnable}</p>
              <p className="text-xs text-muted-foreground">{t.eisenhowerEnableDesc}</p>
            </div>
            <Switch checked={apps.eisenhower} onCheckedChange={toggle} />
          </div>

          {apps.eisenhower && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t.eisenhowerCustomize}</p>
                <Button variant="ghost" size="sm" onClick={resetDefaults} className="h-7 text-xs">
                  {t.eisenhowerResetDefaults}
                </Button>
              </div>
              <div className="grid gap-2">
                {DEFAULT_QUADRANTS.map(q => {
                  const currentDot = custom[q.id]?.dotColor || custom[q.id]?.tint || q.dotColor

                  const getHex = () => {
                    if (currentDot?.startsWith('#')) return currentDot
                    if (currentDot === 'bg-rose-500') return '#f43f5e'
                    if (currentDot === 'bg-amber-500') return '#f59e0b'
                    if (currentDot === 'bg-sky-500') return '#0ea5e9'
                    if (currentDot === 'bg-slate-500') return '#64748b'
                    if (currentDot === 'bg-emerald-500') return '#10b981'
                    if (currentDot === 'bg-indigo-500') return '#6366f1'
                    if (currentDot === 'bg-fuchsia-500') return '#d946ef'
                    if (currentDot === 'bg-zinc-500') return '#71717a'
                    return '#888888'
                  }
                  
                  return (
                    <div key={q.id} className="flex items-center gap-2">
                      <Input
                        value={custom[q.id]?.name !== undefined ? custom[q.id].name : t[q.labelKey]}
                        onChange={e => updateQuadrant(q.id, { name: e.target.value })}
                        placeholder={t[q.labelKey]}
                        className="h-8 text-sm flex-1"
                      />
                      <ClassColorDot compact color={getHex()} onChange={hex => handleColorChange(q.id, hex)} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <ConfirmDialog open={confirmOff} onOpenChange={setConfirmOff}
          title={t.appDisableTitle} description={t.appDisableDesc} onConfirm={disable} />
      </DialogContent>
    </Dialog>
  )
}
