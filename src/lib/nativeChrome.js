const PLUGIN_NAME = 'OrganizerChrome'
const TAB_SELECTED_EVENT = 'tabSelected'

function plugin() {
  if (typeof window === 'undefined') return null
  if (window.Capacitor?.getPlatform?.() !== 'ios') return null
  return window.Capacitor?.Plugins?.[PLUGIN_NAME] ?? null
}

export function nativeTabBarAvailable() {
  return plugin() !== null
}

export async function showNativeTabBar(spec) {
  const api = plugin()
  if (!api) return false
  try {
    await api.setTabBar({ payload: JSON.stringify(spec) })
    return true
  } catch {
    return false
  }
}

export async function hideNativeTabBar() {
  const api = plugin()
  if (!api) return
  try {
    await api.hideTabBar()
  } catch {
    return
  }
}

export function onNativeTabSelected(callback) {
  const api = plugin()
  if (!api) return () => {}
  const pending = Promise.resolve(api.addListener(TAB_SELECTED_EVENT, callback)).catch(() => null)
  return () => {
    pending.then(handle => handle?.remove?.())
  }
}
