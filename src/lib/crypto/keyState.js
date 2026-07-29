const PREFIX = 'f4rsantos.github.io/organizer:'
const LEGACY_KEY = `${PREFIX}encryption-key`
const ENABLED_FLAG_KEY = `${PREFIX}encryption-enabled`

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

export function isEncryptionEnabled() {
  return Boolean(loadKeyString())
}

export function wasEncryptionEverEnabled() {
  return read(ENABLED_FLAG_KEY) === '1'
}

export function assertKeyExpected() {
  const keyString = loadKeyString()
  if (keyString) return keyString
  if (wasEncryptionEverEnabled()) throw new Error('encryption-key-required')
  return null
}
