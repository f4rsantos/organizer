import { readDevicePref, writeDevicePref } from '../devicePrefs'

const PREFIX = 'f4rsantos.github.io/organizer:'
const LEGACY_KEY = `${PREFIX}encryption-key`
const ENABLED_FLAG_KEY = `${PREFIX}encryption-enabled`
const MODE_KEY = `${PREFIX}enc-mode`
const LOCAL_WRAPS_KEY = `${PREFIX}enc-local-wraps`
const DEK_ID_KEY = `${PREFIX}enc-dek-id`
const PLAINTEXT_ACK_PREF = 'plaintextSyncAck'

export const MODE_OFF = 'off'
export const MODE_LOCAL = 'local'
export const MODE_SYNC = 'sync'
const MODES = [MODE_OFF, MODE_LOCAL, MODE_SYNC]

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function loadKeyString() {
  return read(LEGACY_KEY)
}

export function saveKeyString(keyString) {
  write(LEGACY_KEY, keyString)
  write(ENABLED_FLAG_KEY, '1')
}

export function clearKeyString() {
  remove(LEGACY_KEY)
  remove(ENABLED_FLAG_KEY)
}

export function getEncMode() {
  const mode = read(MODE_KEY)
  return MODES.includes(mode) ? mode : MODE_OFF
}

export function setEncMode(mode) {
  if (!MODES.includes(mode)) throw new Error('enc-mode-invalid')
  if (mode === MODE_OFF) {
    remove(MODE_KEY)
    return
  }
  write(MODE_KEY, mode)
}

export function isEncryptionEnabled() {
  return getEncMode() !== MODE_OFF || Boolean(loadKeyString())
}

export function wasEncryptionEverEnabled() {
  return getEncMode() !== MODE_OFF || read(ENABLED_FLAG_KEY) === '1'
}

export function assertKeyExpected() {
  const keyString = loadKeyString()
  if (keyString) return keyString
  if (wasEncryptionEverEnabled()) throw new Error('encryption-key-required')
  return null
}

export function loadLocalWraps() {
  try {
    const raw = read(LOCAL_WRAPS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLocalWraps(wraps) {
  return write(LOCAL_WRAPS_KEY, JSON.stringify(wraps))
}

export function clearLocalWraps() {
  remove(LOCAL_WRAPS_KEY)
}

export function loadDekId() {
  return read(DEK_ID_KEY)
}

export function saveDekId(dekId) {
  if (!dekId) return false
  return write(DEK_ID_KEY, dekId)
}

export function clearDekId() {
  return remove(DEK_ID_KEY)
}

export function isPlaintextSyncAcknowledged() {
  return readDevicePref(PLAINTEXT_ACK_PREF) === true
}

export function acknowledgePlaintextSync() {
  writeDevicePref(PLAINTEXT_ACK_PREF, true)
}
