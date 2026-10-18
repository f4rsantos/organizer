import { useMemo, useState } from 'react'
import { ArrowRight, CornerDownLeft, Search, Sparkles, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { APP_PLUGINS, getAppById } from '@/apps/registry'
import { searchSettings } from '@/lib/settings/settingsSearch'
import { useSettingsIntent } from '@/hooks/useSettingsIntent'

const MAX_RESULTS = 8

const SECTION_LABEL_KEYS = {
  semester: 'semester', classes: 'classes', holidays: 'holidays', grades: 'gradeComponents',
  tasks: 'tasks', kanban: 'kanban', calendar: 'calendar', focus: 'focus',
  notifications: 'notifications', general: 'general', navbar: 'navbar', data: 'data', apps: 'apps',
}

function IntentRow({ intent, active, onApply }) {
  return (
    <button type="button" onClick={onApply}
      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-foreground hover:bg-primary/15')}>
      <Sparkles className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm font-medium">{intent.label}</span>
      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </button>
  )
}

function ResultRow({ result, t, active, onSelect }) {
  return (
    <button type="button" onClick={onSelect}
      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        active ? 'bg-secondary' : 'hover:bg-secondary/60')}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{t[result.labelKey]}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {t[SECTION_LABEL_KEYS[result.section]]}
          {result.descKey && t[result.descKey] ? ` · ${t[result.descKey]}` : ''}
        </span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  )
}

export function SettingsSearch({ query, onQueryChange, sections, onReveal }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [cursor, setCursor] = useState(0)
  const [appModal, setAppModal] = useState(null)
  const visibleApps = useStore(s => APP_PLUGINS.filter(p => !p.isVisible || p.isVisible(s)).map(p => p.id).join(','))

  const intent = useSettingsIntent(query, t)
  const results = useMemo(() => {
    const apps = APP_PLUGINS.filter(p => visibleApps.split(',').includes(p.id))
    return searchSettings(query, { t, apps, sections }).slice(0, MAX_RESULTS)
  }, [query, t, sections, visibleApps])

  const rows = [...(intent ? [{ kind: 'intent' }] : []), ...results.map(r => ({ kind: 'result', result: r }))]
  const activeIndex = Math.min(cursor, Math.max(0, rows.length - 1))

  const applyIntent = () => {
    intent.apply()
    onQueryChange('')
  }

  const selectResult = result => {
    const app = result.appId ? getAppById(result.appId) : null
    if (app?.SettingsModal && app.isEnabled(useStore.getState())) {
      setAppModal(result.appId)
      return
    }
    onReveal(result.section, t[result.labelKey])
  }

  const activate = row => {
    if (!row) return
    if (row.kind === 'intent') applyIntent()
    else selectResult(row.result)
  }

  const onKeyDown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(Math.min(rows.length - 1, activeIndex + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(Math.max(0, activeIndex - 1)) }
    if (e.key === 'Enter') { e.preventDefault(); activate(rows[activeIndex]) }
    if (e.key === 'Escape') onQueryChange('')
  }

  const ActiveModal = appModal ? getAppById(appModal)?.SettingsModal : null
  const trimmed = query.trim()

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onKeyDown={onKeyDown} placeholder={t.settingsSearchPlaceholder}
          onChange={e => { onQueryChange(e.target.value); setCursor(0) }}
          className="h-10 rounded-xl pl-9 pr-9" aria-label={t.settingsSearchPlaceholder} />
        {query && (
          <button type="button" onClick={() => onQueryChange('')} aria-label={t.cancel}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {trimmed && (
        <div className="space-y-1 rounded-2xl border border-border bg-card p-1.5">
          {rows.map((row, i) => row.kind === 'intent'
            ? <IntentRow key="intent" intent={intent} active={i === activeIndex} onApply={applyIntent} />
            : <ResultRow key={row.result.id} result={row.result} t={t} active={i === activeIndex} onSelect={() => selectResult(row.result)} />)}
          {!rows.length && <p className="px-3 py-4 text-center text-sm text-muted-foreground">{t.settingsSearchEmpty}</p>}
        </div>
      )}
      {ActiveModal && <ActiveModal open onOpenChange={v => !v && setAppModal(null)} />}
    </div>
  )
}
