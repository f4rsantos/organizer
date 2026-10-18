import { useMemo, useState } from 'react'
import { Search, Settings2, Users } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CollabAppModal } from './apps/CollabAppModal'
import { APP_PLUGINS, getAppById } from '@/apps/registry'

const COLLAB = { id: 'collab', labelKey: 'collabApp', icon: Users, keywords: ['collab', 'colaboração', 'teams', 'share', 'firebase'] }

function AppRow({ app, t, onToggle, onOpenSettings }) {
  const Icon = app.icon
  const canOpen = app.active && app.hasSettings
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors', app.active ? 'text-primary' : 'text-muted-foreground')} />
      <button type="button" onClick={canOpen ? onOpenSettings : () => onToggle(!app.active)} className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium">{t[app.labelKey]}</span>
        {app.descKey && <span className="block truncate text-xs text-muted-foreground">{t[app.descKey]}</span>}
      </button>
      {canOpen && (
        <button type="button" onClick={onOpenSettings} aria-label={t.settings}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Settings2 className="h-4 w-4" />
        </button>
      )}
      <Switch checked={app.active} onCheckedChange={onToggle} />
    </div>
  )
}

function setAppEnabled(plugin, value) {
  const state = useStore.getState()
  plugin.setEnabled(state.updateSettings, state.settings?.apps ?? {}, value, state)
}

export function AppsGrid() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const state = useStore(s => s)
  const wipeAppData = useStore(s => s.wipeAppData)
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const [modal, setModal] = useState(null)
  const [confirmOff, setConfirmOff] = useState(null)
  const [query, setQuery] = useState('')

  const entries = useMemo(() => {
    const all = [
      { ...COLLAB, active: collabEnabled, hasSettings: true },
      ...APP_PLUGINS.filter(p => !p.isVisible || p.isVisible(state)).map(p => ({
        id: p.id, labelKey: p.labelKey, descKey: p.descKey, icon: p.icon, keywords: p.keywords ?? [],
        active: p.isEnabled(state), hasSettings: Boolean(p.SettingsModal),
      })),
    ]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter(a => t[a.labelKey].toLowerCase().includes(q) || a.keywords.some(k => k.includes(q)))
  }, [collabEnabled, state, query, t])

  const toggle = (id, value) => {
    if (id === COLLAB.id) { setModal(id); return }
    const plugin = getAppById(id)
    if (!value && plugin.wipe) { setConfirmOff(id); return }
    setAppEnabled(plugin, value)
    if (value && plugin.needsSetup) setModal(id)
  }

  const disableConfirmed = () => {
    const plugin = getAppById(confirmOff)
    wipeAppData(plugin.wipe)
    setAppEnabled(plugin, false)
  }

  const ActiveModal = getAppById(modal)?.SettingsModal ?? null

  return (
    <>
      <div className="relative mb-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.appsSearch} className="h-8 pl-8" />
      </div>
      <div className="divide-y divide-border/60">
        {entries.map(app => (
          <AppRow key={app.id} app={app} t={t} onToggle={v => toggle(app.id, v)} onOpenSettings={() => setModal(app.id)} />
        ))}
        {!entries.length && <p className="py-4 text-center text-xs text-muted-foreground">{t.appsNoResults}</p>}
      </div>
      <CollabAppModal open={modal === COLLAB.id} onOpenChange={v => !v && setModal(null)} />
      {ActiveModal && <ActiveModal open onOpenChange={v => !v && setModal(null)} />}
      <ConfirmDialog open={Boolean(confirmOff)} onOpenChange={v => !v && setConfirmOff(null)}
        title={t.appDisableTitle} description={t.appDisableDesc} onConfirm={disableConfirmed} />
    </>
  )
}
