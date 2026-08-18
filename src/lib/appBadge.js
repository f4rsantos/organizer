export function updateBadge(count) {
  try {
    if (!('setAppBadge' in navigator)) return
    if (count > 0) navigator.setAppBadge(count)
    else navigator.clearAppBadge()
  } catch {
    // Badging is best effort: a denied permission must not break the caller.
  }
}
