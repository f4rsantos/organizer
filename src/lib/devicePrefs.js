const PREFIX = 'f4rsantos.github.io/organizer:'
const DEVICE_KEY = `${PREFIX}device`

function readAll() {
  try {
    const raw = localStorage.getItem(DEVICE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(prefs) {
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}

export function readDevicePref(key, fallback = null) {
  const value = readAll()[key]
  return value === undefined ? fallback : value
}

export function writeDevicePref(key, value) {
  const prefs = readAll()
  if (value === undefined || value === null) delete prefs[key]
  else prefs[key] = value
  return writeAll(prefs)
}
