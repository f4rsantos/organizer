import { isNativePlatform } from '@/lib/platform'
import { buildProjection, emptyProjection } from './projection'

const PLUGIN_NAME = 'OrganizerWidgets'

function plugin() {
  if (!isNativePlatform()) return null
  return window.Capacitor?.Plugins?.[PLUGIN_NAME] ?? null
}

export function widgetsAvailable() {
  return plugin() !== null
}

export async function pushProjection(state, now = new Date()) {
  const api = plugin()
  if (!api) return false
  try {
    await api.setProjection({ payload: JSON.stringify(buildProjection(state, now)) })
    return true
  } catch {
    return false
  }
}

export async function clearProjection(now = new Date()) {
  const api = plugin()
  if (!api) return false
  try {
    await api.setProjection({ payload: JSON.stringify(emptyProjection(now)) })
    return true
  } catch {
    return false
  }
}

export async function consumeLaunchTab() {
  const api = plugin()
  if (!api) return null
  try {
    const result = await api.consumeLaunchTab()
    return typeof result?.tab === 'string' && result.tab ? result.tab : null
  } catch {
    return null
  }
}

export async function drainQueue() {
  const api = plugin()
  if (!api) return []
  try {
    const result = await api.drainQueue()
    const ops = result?.ops
    if (typeof ops === 'string') return JSON.parse(ops)
    return Array.isArray(ops) ? ops : []
  } catch {
    return []
  }
}
