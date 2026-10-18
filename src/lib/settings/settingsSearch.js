import { editDistance, maxEditsFor } from '../parser/editDistance.js'
import { visibleLangs } from '../langs.js'
import { SETTINGS_INDEX } from './settingsIndex.js'

const LABEL_WEIGHT = 3
const SECTION_WEIGHT = 2
const KEYWORD_WEIGHT = 2
const DESC_WEIGHT = 1
const PREFIX_FACTOR = 0.7
const FUZZY_PENALTY_PER_EDIT = 0.2
const MIN_COVERAGE = 0.5
const MIN_PREFIX_LENGTH = 3

const SECTION_LABEL_KEYS = {
  semester: 'semester', classes: 'classes', holidays: 'holidays', grades: 'gradeComponents',
  tasks: 'tasks', kanban: 'kanban', calendar: 'calendar', focus: 'focus',
  notifications: 'notifications', general: 'general', navbar: 'navbar', data: 'data', apps: 'apps',
}

const FILLER_WORDS = new Set([
  'how', 'do', 'does', 'did', 'i', 'can', 'could', 'where', 'what', 'which', 'is', 'are', 'the', 'a', 'an',
  'my', 'me', 'to', 'of', 'in', 'on', 'for', 'with', 'it', 'be', 'get', 'want', 'wanna', 'make', 'change',
  'set', 'setting', 'settings', 'option', 'options', 'please', 'find', 'turn', 'switch', 'there', 'this',
  'that', 'you', 'your', 'up', 'so', 'and', 'or', 'way', 'would', 'like', 'should', 'need', 'let', 'into',
  'como', 'onde', 'quero', 'mudar', 'alterar', 'o', 'os', 'as', 'um', 'uma', 'meu', 'minha', 'para', 'de', 'do', 'no', 'na', 'e',
  'donde', 'cambiar', 'quiero', 'el', 'la', 'los', 'las', 'mi', 'en', 'y',
  'comment', 'ou', 'changer', 'je', 'veux', 'le', 'les', 'mon', 'ma', 'des', 'et',
  'wie', 'wo', 'ich', 'will', 'mochte', 'andern', 'der', 'die', 'das', 'mein', 'meine', 'und', 'zu',
  'jak', 'kde', 'chci', 'zmenit', 'muj', 'moje', 'a',
])

const PHRASE_ALIASES = [
  [/\bback\s+up\b/g, 'backup'],
  [/\bdark\s+mode\b/g, 'dark theme'],
  [/\blight\s+mode\b/g, 'light theme'],
  [/\bday\s+off\b/g, 'holiday'],
]

const SYNONYMS = {
  backup: ['export', 'backup'],
  save: ['export'],
  restore: ['import'],
  sync: ['sync', 'firebase', 'cloud'],
  cloud: ['sync', 'cloud'],
  password: ['encryption', 'passphrase'],
  lock: ['encryption'],
  private: ['encryption', 'privacy'],
  dark: ['theme', 'dark'],
  light: ['theme', 'light'],
  appearance: ['theme', 'colour'],
  color: ['colour', 'color'],
  colour: ['colour', 'color'],
  remind: ['reminder', 'remind'],
  reminders: ['reminder'],
  alerts: ['alert'],
  deadline: ['due', 'deadline'],
  vacation: ['holiday'],
  vacations: ['holiday'],
  subjects: ['class'],
  courses: ['class', 'course'],
  timer: ['focus', 'timer'],
  pomodoro: ['focus', 'pomodoro'],
  tabs: ['tab', 'navbar'],
  menu: ['navbar'],
  sidebar: ['navbar', 'sidebar'],
  voice: ['voice', 'speech'],
  mic: ['microphone', 'voice'],
}

export function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function words(text) {
  return normalizeText(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

function queryTokens(query) {
  let text = normalizeText(query)
  for (const [pattern, replacement] of PHRASE_ALIASES) text = text.replace(pattern, replacement)
  const meaningful = words(text).filter(w => !FILLER_WORDS.has(w))
  return meaningful.map(word => ({ word, alternatives: SYNONYMS[word] ?? [word] }))
}

function wordScore(token, haystack, weight) {
  let best = 0
  for (const candidate of haystack) {
    if (candidate === token) return weight
    const prefix = token.length >= MIN_PREFIX_LENGTH && (candidate.startsWith(token) || (candidate.length >= 4 && token.startsWith(candidate)))
    if (prefix) best = Math.max(best, weight * PREFIX_FACTOR)
    const max = maxEditsFor(token)
    if (max === 0) continue
    const distance = editDistance(token, candidate, max)
    if (distance <= max) best = Math.max(best, weight * (1 - FUZZY_PENALTY_PER_EDIT * distance))
  }
  return best
}

function entryFields(entry, t) {
  return [
    { words: words(t[entry.labelKey]), weight: LABEL_WEIGHT },
    { words: words(t[SECTION_LABEL_KEYS[entry.section]]), weight: SECTION_WEIGHT },
    { words: (entry.keywords ?? []).flatMap(words), weight: KEYWORD_WEIGHT },
    { words: entry.descKey ? words(t[entry.descKey]) : [], weight: DESC_WEIGHT },
  ]
}

function tokenScore(token, fields) {
  let best = 0
  for (const alt of token.alternatives) {
    for (const field of fields) best = Math.max(best, wordScore(alt, field.words, field.weight))
  }
  return best
}

function scoreEntry(entry, tokens, t) {
  const fields = entryFields(entry, t)
  const scores = tokens.map(token => tokenScore(token, fields))
  const matched = scores.filter(s => s > 0).length
  const coverage = matched / tokens.length
  if (coverage < MIN_COVERAGE) return 0
  return scores.reduce((sum, s) => sum + s, 0) * (0.5 + coverage)
}

function appEntries(apps) {
  return (apps ?? []).map(app => ({
    id: `app:${app.id}`,
    section: 'apps',
    labelKey: app.labelKey,
    descKey: app.descKey,
    keywords: app.keywords ?? [],
    appId: app.id,
  }))
}

export function searchSettings(query, { t, apps = [], sections = null }) {
  const tokens = queryTokens(query)
  if (!tokens.length) return []
  const entries = [...SETTINGS_INDEX, ...appEntries(apps)]
    .filter(entry => !sections || sections.has(entry.section))
  return entries
    .map((entry, order) => ({ ...entry, order, score: scoreEntry(entry, tokens, t) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
}

const THEME_WORDS = {
  dark: ['dark', 'night', 'escuro', 'oscuro', 'sombre', 'dunkel', 'tmavy', 'tmave'],
  light: ['light', 'claro', 'clair', 'hell', 'svetly', 'svetle'],
  system: ['system', 'sistema', 'systeme', 'automatic', 'auto'],
}
const THEME_CUES = new Set(['theme', 'mode', 'tema', 'modo', 'thema', 'motiv', 'appearance'])

const LANGUAGE_NAMES = {
  en: ['english', 'ingles', 'anglais', 'englisch', 'anglictina'],
  pt: ['portuguese', 'portugues', 'portugais', 'portugiesisch', 'portugalstina'],
  fr: ['french', 'frances', 'francais', 'franzosisch', 'francouzstina'],
  de: ['german', 'alemao', 'aleman', 'allemand', 'deutsch', 'nemcina'],
  es: ['spanish', 'espanhol', 'espanol', 'espagnol', 'spanisch', 'spanelstina'],
  cs: ['czech', 'checo', 'tcheque', 'tschechisch', 'cestina'],
  pirate: ['pirate', 'pirata'],
}

const ENABLE_VERBS = new Set(['enable', 'activate', 'add', 'install', 'ativar', 'ligar', 'activar', 'activer', 'aktivieren', 'zapnout', 'aktivovat'])

function themeIntent(tokens) {
  const has = list => list.some(w => tokens.includes(w))
  if (has(THEME_WORDS.dark)) return { type: 'theme', value: 'dark' }
  if (has(THEME_WORDS.light)) return { type: 'theme', value: 'light' }
  if (has(THEME_WORDS.system) && tokens.some(w => THEME_CUES.has(w))) return { type: 'theme', value: 'system' }
  return null
}

function langIntent(tokens) {
  for (const lang of visibleLangs()) {
    const names = [...(LANGUAGE_NAMES[lang.code] ?? []), ...words(lang.label)]
    if (names.some(name => tokens.includes(name))) return { type: 'lang', value: lang.code }
  }
  return null
}

function appIntent(tokens, apps, t) {
  const wantsOn = tokens.some(w => ENABLE_VERBS.has(w)) || (tokens.includes('turn') && tokens.includes('on'))
  if (!wantsOn) return null
  const app = apps.find(a => {
    const names = [...words(t[a.labelKey]), ...words(a.id)]
    return names.some(name => tokens.includes(name))
  })
  return app ? { type: 'app', appId: app.id } : null
}

export function parseSettingsIntent(query, { apps = [], t }) {
  const tokens = words(query)
  if (!tokens.length) return null
  return themeIntent(tokens) ?? langIntent(tokens) ?? appIntent(tokens, apps, t)
}
