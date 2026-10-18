import { getStrings } from '../lib/strings/index.js'
import { parseWithFallback } from '../lib/quickAction/parseWithFallback.js'
import { buildAgenda } from '../lib/calendar/agenda.js'
import { canUndo, executeQuickAction, quickActionScope, storeQuickActionContext, undoQuickAction } from '../lib/quickAction/execute.js'
import { previewQuickAction } from '../lib/quickAction/preview.js'
import { parseSettingsIntent, searchSettings } from '../lib/settings/settingsSearch.js'
import { visibleLangs } from '../lib/langs.js'
import { migrateState, normalizeState } from '../store/migrations.js'
import { stripTransient } from '../lib/crypto/index.js'
import { createPainter, formatAgenda, formatEffects, formatTaskList } from './format.js'

const DEFAULT_AGENDA_DAYS = 7
const MAX_AGENDA_DAYS = 60
const SETTINGS_RESULTS = 5
const DRY_RUN_FLAGS = new Set(['-n', '--dry-run'])
const FALLBACK_LANG = 'en'

function strings(env) {
  return getStrings(env.store.getState().lang ?? 'en')
}

function out(env, value, text) {
  env.print(env.json ? JSON.stringify(value, null, 2) : text)
}

function helpText(t, paint) {
  const width = Math.max(...t.cliHelpCommands.map(([usage]) => usage.length)) + 2
  const rows = t.cliHelpCommands.map(([usage, desc]) => `  ${paint.cyan(usage.padEnd(width))}${desc}`)
  return [paint.bold('organizer'), t.cliHelpIntro, '', ...rows].join('\n')
}

function parseDays(arg) {
  const n = Number.parseInt(arg ?? '', 10)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_AGENDA_DAYS
  return Math.min(n, MAX_AGENDA_DAYS)
}

function agendaCommand(args, env, { days } = {}) {
  const t = strings(env)
  const now = env.now()
  const agenda = buildAgenda(env.store.getState(), { from: now, days: days ?? parseDays(args[0]) })
  out(env, agenda, formatAgenda(agenda, { now, t, paint: env.paint }))
  return 0
}

function tasksCommand(args, env) {
  const t = strings(env)
  const state = env.store.getState()
  const { semesterId, classes } = quickActionScope(state)
  const showAll = args.includes('--all')
  const tasks = (state.tasks ?? [])
    .filter(task => (task.semesterId ?? null) === semesterId && task.views?.list !== false)
    .filter(task => showAll || !task.done)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  out(env, tasks, formatTaskList(tasks, { t, paint: env.paint, classes }))
  return 0
}

function previewLines(rows, t, paint) {
  return rows.map(row => {
    const chips = row.chips?.length ? paint.dim(` · ${row.chips.join(' · ')}`) : ''
    const missing = row.missing ? paint.red(` (${t.qaNoMatch(row.title)})`) : ''
    const kind = row.action ?? row.kind
    return `  ${paint.cyan(kind)} ${row.title ?? ''}${chips}${missing}`
  }).join('\n')
}

function quickActionCommand(args, env) {
  const t = strings(env)
  const dryRun = args.some(a => DRY_RUN_FLAGS.has(a))
  const text = args.filter(a => !DRY_RUN_FLAGS.has(a)).join(' ')
  const now = env.now()
  const state = env.store.getState()
  const scope = quickActionScope(state)
  const items = parseWithFallback(text, {
    classes: scope.classes, columns: scope.columns, now, t, lang: state.lang ?? 'en',
    apps: state.settings?.apps ?? {}, navbar: state.settings?.navbar ?? {},
  }, { lang: FALLBACK_LANG, t: getStrings(FALLBACK_LANG) })
  if (!items.length) {
    env.print(env.paint.dim(t.cliNothingHappened))
    return 1
  }
  const ctx = storeQuickActionContext(env.store, { t, now })
  if (dryRun) {
    const rows = previewQuickAction(items, ctx)
    out(env, rows, previewLines(rows, t, env.paint))
    return 0
  }
  const result = executeQuickAction(items, ctx)
  if (canUndo(result.effects)) env.lastAction.set(result)
  out(env, result, `${formatEffects(result.effects, { t, paint: env.paint })}\n${env.paint.dim(t.cliUndoHint)}`)
  env.changed = true
  return 0
}

function undoCommand(env) {
  const t = strings(env)
  const last = env.lastAction.get()
  if (!last?.effects?.length) {
    env.print(env.paint.dim(t.cliNothingToUndo))
    return 1
  }
  undoQuickAction(last.effects, storeQuickActionContext(env.store, { t, now: env.now() }))
  env.lastAction.set(null)
  env.print(env.paint.green(t.qaUndo))
  env.changed = true
  return 0
}

function applyIntent(intent, env) {
  const state = env.store.getState()
  if (intent.type === 'theme') state.setTheme(intent.value)
  if (intent.type === 'lang') state.setLang(intent.value)
  env.changed = true
}

function settingsCommand(args, env) {
  const t = strings(env)
  const query = args.join(' ')
  const intent = parseSettingsIntent(query, { apps: [], t })
  if (intent) {
    applyIntent(intent, env)
    env.print(env.paint.green(`✓ ${query}`))
    return 0
  }
  const results = searchSettings(query, { t }).slice(0, SETTINGS_RESULTS)
  if (!results.length) {
    env.print(env.paint.dim(t.settingsSearchEmpty))
    return 1
  }
  out(env, results.map(r => r.id), results.map(r => `  ${t[r.labelKey]}${env.paint.dim(` · ${t.cliOpenInApp}`)}`).join('\n'))
  return 0
}

function langCommand(args, env) {
  const code = args[0]
  if (!visibleLangs().some(l => l.code === code)) {
    env.print(visibleLangs().map(l => `  ${env.paint.cyan(l.code.padEnd(7))}${l.label}`).join('\n'))
    return code ? 1 : 0
  }
  env.store.getState().setLang(code)
  env.changed = true
  env.print(env.paint.green(`✓ ${getStrings(code).cliLanguageSet}`))
  return 0
}

function importCommand(args, env) {
  const t = strings(env)
  if (!args[0]) { env.print(t.cliNeedsFile); return 1 }
  const { state, status } = migrateState(JSON.parse(env.readFile(args[0])))
  if (status === 'invalid' || status === 'newer') { env.print(env.paint.red(t.obFileInvalid)); return 1 }
  env.store.getState().importData(normalizeState(state), { preferLocalSettings: false })
  env.changed = true
  env.print(env.paint.green(`✓ ${args[0]}`))
  return 0
}

function exportCommand(args, env) {
  const payload = JSON.stringify(stripTransient(env.store.getState()), null, 2)
  if (!args[0]) { env.print(payload); return 0 }
  env.writeFile(args[0], payload)
  env.print(env.paint.green(`✓ ${args[0]}`))
  return 0
}

async function syncCommand(args, env) {
  const t = strings(env)
  if (!env.sync) { env.print(env.paint.red(t.cliSyncUnavailable)); return 1 }
  const [sub, file] = args
  const message = await env.sync.run(sub ?? 'status', { file })
  env.print(message)
  return 0
}

const COMMANDS = {
  help: (_args, env) => { env.print(helpText(strings(env), env.paint)); return 0 },
  agenda: agendaCommand,
  today: (_args, env) => agendaCommand([], env, { days: 1 }),
  week: (_args, env) => agendaCommand([], env, { days: DEFAULT_AGENDA_DAYS }),
  tasks: tasksCommand,
  undo: (_args, env) => undoCommand(env),
  settings: settingsCommand,
  lang: langCommand,
  import: importCommand,
  export: exportCommand,
  sync: syncCommand,
}

export function isCommand(word) {
  return Object.hasOwn(COMMANDS, word)
}

export async function runCli(argv, env) {
  const json = argv.includes('--json')
  const args = argv.filter(a => a !== '--json')
  const runEnv = Object.assign(env, { json, paint: env.paint ?? createPainter(false) })
  const [first, ...rest] = args
  if (!first || first === '--help' || first === '-h') return COMMANDS.help(rest, runEnv)
  if (isCommand(first)) return COMMANDS[first](rest, runEnv)
  return quickActionCommand(args, runEnv)
}
