import { readJson, writeJson } from './safeStorage'

const CONFIG_KEY ='f4rsantos.github.io/organizer:firebase'

const FIREBASE_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'databaseURL',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'measurementId',
]

const QUOTE_LOOKALIKES = /[\u2018\u2019\u201A\u201B\u2032\u00B4]/g
const DOUBLE_QUOTE_LOOKALIKES = /[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g
const EXOTIC_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g
const EXOTIC_COLONS = /[\uFF1A\uFE55]/g

function normalizeConfigText(raw) {
  return String(raw ?? '')
    .replace(INVISIBLE_CHARS, '')
    .replace(EXOTIC_SPACES, ' ')
    .replace(QUOTE_LOOKALIKES, "'")
    .replace(DOUBLE_QUOTE_LOOKALIKES, '"')
    .replace(EXOTIC_COLONS, ':')
    .replace(/\r\n?/g, '\n')
}

function extractConfigValue(text, key) {
  const quotedKey = `["'\`]?${key}["'\`]?`
  const quoted = new RegExp(`(?:^|[^\\w])${quotedKey}\\s*[:=]\\s*(["'\`])([\\s\\S]*?)\\1`)
  const quotedMatch = text.match(quoted)
  if (quotedMatch) return quotedMatch[2].replace(/\s+/g, '')
  const bare = new RegExp(`(?:^|[^\\w])${quotedKey}\\s*[:=]\\s*([^\\s,;}"'\`]+)`)
  return text.match(bare)?.[1] ?? null
}

export function parseFirebaseConfig(raw) {
  const text = normalizeConfigText(raw)
  const config = {}
  for (const key of FIREBASE_CONFIG_KEYS) {
    const value = extractConfigValue(text, key)
    if (value) config[key] = value
  }
  if (!config.apiKey || !config.projectId) return null
  return config
}

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
