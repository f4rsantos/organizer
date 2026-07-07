import { useMemo, useState } from 'react'
import { Users, Search } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { CollabAppModal } from './apps/CollabAppModal'
import { APP_PLUGINS } from '@/apps/registry'

function AppCard({ icon: Icon, name, active, onClick }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium">{name}</span>
    </button>
  )
}

const COLLAB = { id: 'collab', labelKey: 'collabApp', icon: Users, keywords: ['collab', 'colaboração', 'teams', 'share', 'firebase'] }

export function AppsGrid() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const state = useStore(s => s)
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const [modal, setModal] = useState(null)
  const [query, setQuery] = useState('')

  const entries = useMemo(() => {
    const all = [
      { ...COLLAB, active: collabEnabled },
      ...APP_PLUGINS.filter(p => !p.isVisible || p.isVisible(state))
        .map(p => ({ id: p.id, labelKey: p.labelKey, icon: p.icon, keywords: p.keywords ?? [], active: p.isEnabled(state) })),
    ]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter(a => t[a.labelKey].toLowerCase().includes(q) || a.keywords.some(k => k.includes(q)))
  }, [collabEnabled, state, query, t])

  const ActiveModal = APP_PLUGINS.find(p => p.id === modal)?.SettingsModal ?? null

  return (
    <>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.appsSearch} className="h-8 pl-8" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(a => (
          <AppCard key={a.id} icon={a.icon} name={t[a.labelKey]} active={a.active} onClick={() => setModal(a.id)} />
        ))}
        {!entries.length && <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">{t.appsNoResults}</p>}
      </div>
      <CollabAppModal open={modal === 'collab'} onOpenChange={v => !v && setModal(null)} />
      {ActiveModal && <ActiveModal open onOpenChange={v => !v && setModal(null)} />}
    </>
  )
}
