export function clearBadge() {
  if (!('clearAppBadge' in navigator)) return
  try {
    void navigator.clearAppBadge()
  } catch {
    return
  }
}
