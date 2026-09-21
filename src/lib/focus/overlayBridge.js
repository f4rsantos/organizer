import { isNativePlatform } from '@/lib/platform'

const PLUGIN_NAME = 'FocusOverlay'

function plugin() {
  if (!isNativePlatform()) return null
  return window.Capacitor?.Plugins?.[PLUGIN_NAME] ?? null
}

export function focusOverlayAvailable() {
  return plugin() !== null
}

export async function hasOverlayPermission() {
  const api = plugin()
  if (!api) return false
  try {
    const result = await api.hasPermission()
    return result?.granted === true
  } catch {
    return false
  }
}

export async function requestOverlayPermission() {
  const api = plugin()
  if (!api) return false
  try {
    const result = await api.requestPermission()
    return result?.granted === true
  } catch {
    return false
  }
}

export async function showFocusOverlay({ label, running, isBreak }) {
  const api = plugin()
  if (!api) return false
  try {
    await api.show({ label, running, isBreak })
    return true
  } catch {
    return false
  }
}

export async function updateFocusOverlay({ label, running, isBreak }) {
  const api = plugin()
  if (!api) return false
  try {
    await api.update({ label, running, isBreak })
    return true
  } catch {
    return false
  }
}

export async function hideFocusOverlay() {
  const api = plugin()
  if (!api) return false
  try {
    await api.hide()
    return true
  } catch {
    return false
  }
}

export function addOverlayControlListener(callback) {
  const api = plugin()
  if (!api) return () => {}
  const handle = api.addListener('overlayControl', event => callback(event?.action))
  return () => { handle?.remove?.() }
}
