import { readJson } from './safeStorage'

const CONFIG_KEY ='f4rsantos.github.io/organizer:firebase'

export function loadFirebaseConfig() {
  return readJson(CONFIG_KEY, null)
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_KEY)
}
