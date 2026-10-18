import { Switch } from '@/components/ui/switch'
import { useStore } from '@/store/useStore'
import { APP_PLUGINS } from '@/apps/registry'
import { cn } from '@/lib/utils'
import { StepHeading } from './StepHeading'

function offeredApps(state) {
  return APP_PLUGINS.filter(p => p.descKey && p.setEnabled && (!p.isVisible || p.isVisible(state)))
}

function AppToggle({ app, t, enabled, onToggle }) {
  const Icon = app.icon
  return (
    <label className={cn(
      'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors',
      enabled ? 'border-primary/50 bg-primary/[0.05]' : 'border-border bg-card hover:border-foreground/20',
    )}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0 transition-colors', enabled ? 'text-primary' : 'text-muted-foreground')} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{t[app.labelKey]}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{t[app.descKey]}</span>
      </span>
      <Switch checked={enabled} onCheckedChange={onToggle} className="mt-0.5" />
    </label>
  )
}

export function AppsStep({ t }) {
  const state = useStore(s => s)
  const updateSettings = useStore(s => s.updateSettings)
  const apps = offeredApps(state)

  const toggle = (app, value) => {
    const current = useStore.getState()
    app.setEnabled(updateSettings, current.settings?.apps ?? {}, value, current)
  }

  return (
    <div>
      <StepHeading title={t.obAppsTitle} desc={t.obAppsDesc} />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {apps.map(app => (
          <AppToggle key={app.id} app={app} t={t} enabled={app.isEnabled(state)} onToggle={v => toggle(app, v)} />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">{t.obAppsLater}</p>
    </div>
  )
}
