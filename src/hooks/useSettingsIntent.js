import { useStore } from '@/store/useStore'
import { LANGS } from '@/lib/langs'
import { APP_PLUGINS, getAppById } from '@/apps/registry'
import { parseSettingsIntent } from '@/lib/settings/settingsSearch'

const TOGGLEABLE_APPS = APP_PLUGINS.filter(a => a.setEnabled)

function alreadyApplied(intent, state) {
  if (intent.type === 'theme') return state.theme === intent.value
  if (intent.type === 'lang') return state.lang === intent.value
  return Boolean(getAppById(intent.appId)?.isEnabled(state))
}

function intentLabel(intent, t) {
  if (intent.type === 'theme') {
    const names = { dark: t.themeDark, light: t.themeLight, system: t.themeSystem }
    return t.settingsSearchApplyTheme(names[intent.value])
  }
  if (intent.type === 'lang') return t.settingsSearchApplyLang(LANGS.find(l => l.code === intent.value)?.label ?? intent.value)
  return t.settingsSearchEnableApp(t[getAppById(intent.appId)?.labelKey] ?? intent.appId)
}

function applyIntent(intent) {
  const state = useStore.getState()
  if (intent.type === 'theme') state.setTheme(intent.value)
  if (intent.type === 'lang') state.setLang(intent.value)
  if (intent.type === 'app') getAppById(intent.appId).setEnabled(state.updateSettings, state.settings?.apps ?? {}, true, state)
}

export function useSettingsIntent(query, t) {
  const state = useStore(s => s)
  const parsed = query.trim() ? parseSettingsIntent(query, { apps: TOGGLEABLE_APPS, t }) : null
  if (!parsed || alreadyApplied(parsed, state)) return null
  return { ...parsed, label: intentLabel(parsed, t), apply: () => applyIntent(parsed) }
}
