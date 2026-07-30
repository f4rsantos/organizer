import { readJson, writeJson } from './safeStorage'

const PREFIX = 'f4rsantos.github.io/organizer:'
const DEVICE_KEY = `${PREFIX}device`

function readAll() {
  const parsed = readJson(DEVICE_KEY, {})
  return parsed && typeof parsed === 'object' ? parsed : {}
}

function writeAll(prefs) {
  return writeJson(DEVICE_KEY, prefs)
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
