export const isMac = typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')

export const defaultQuickActionShortcut = () => (
  isMac
    ? { key: 'k', code: 'KeyK', ctrl: false, meta: true, shift: false, alt: false }
    : { key: 'k', code: 'KeyK', ctrl: true, meta: false, shift: false, alt: false }
)

const KEY_LABELS = {
  ' ': 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  escape: 'Esc',
  enter: '↵',
  backspace: '⌫',
  tab: '⇥',
}

export function shortcutFromEvent(e) {
  return {
    key: e.key,
    code: e.code || '',
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey,
  }
}

export function matchesShortcut(e, shortcut) {
  if (!shortcut || !shortcut.key) return false
  if (e.ctrlKey !== !!shortcut.ctrl) return false
  if (e.metaKey !== !!shortcut.meta) return false
  if (e.shiftKey !== !!shortcut.shift) return false
  if (e.altKey !== !!shortcut.alt) return false
  if (shortcut.code && e.code) return e.code === shortcut.code
  return String(e.key).toLowerCase() === String(shortcut.key).toLowerCase()
}

function keyLabel(shortcut) {
  const code = shortcut.code || ''
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  const k = String(shortcut.key || '')
  return KEY_LABELS[k.toLowerCase()] || KEY_LABELS[k] || k.toUpperCase()
}

export function formatShortcut(shortcut) {
  if (!shortcut || !shortcut.key) return ''
  const parts = []
  if (isMac) {
    if (shortcut.ctrl) parts.push('⌃')
    if (shortcut.alt) parts.push('⌥')
    if (shortcut.shift) parts.push('⇧')
    if (shortcut.meta) parts.push('⌘')
    parts.push(keyLabel(shortcut))
    return parts.join('')
  }
  if (shortcut.ctrl) parts.push('Ctrl')
  if (shortcut.meta) parts.push('Win')
  if (shortcut.alt) parts.push('Alt')
  if (shortcut.shift) parts.push('Shift')
  parts.push(keyLabel(shortcut))
  return parts.join(' + ')
}
