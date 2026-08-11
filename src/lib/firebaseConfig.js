import { readJson, writeJson } from './safeStorage'

const CONFIG_KEY ='f4rsantos.github.io/organizer:firebase'

export function loadFirebaseConfig() {
  return readJson(CONFIG_KEY, null)
}

export function saveFirebaseConfig(config) {
  return writeJson(CONFIG_KEY, config)
}

export function clearFirebaseConfig() {
  try {
    localStorage.removeItem(CONFIG_KEY)
  } catch {
    return
  }
}
