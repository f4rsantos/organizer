import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createFileStorage } from './fileStorage.js'

const HOME = process.env.ORGANIZER_HOME ?? path.join(os.homedir(), '.organizer')
const STATE_FILE = path.join(HOME, 'state.json')
const STORAGE_FILE = path.join(HOME, 'device.json')
const LAST_ACTION_FILE = path.join(HOME, 'last-action.json')
const QUIET_COMMANDS = new Set(['help', '--help', '-h', 'lang', 'sync', 'export'])

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJsonFile(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

async function readText(file) {
  if (file) return fs.readFileSync(file, 'utf8')
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function systemLang(langs) {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en'
  const code = locale.split('-')[0]
  return langs.some(l => l.code === code) ? code : 'en'
}

async function main() {
  fs.mkdirSync(HOME, { recursive: true })
  globalThis.localStorage = createFileStorage({
    read: () => readJsonFile(STORAGE_FILE, {}),
    write: value => writeJsonFile(STORAGE_FILE, value),
  })

  const { useStore } = await import('../store/useStore.js')
  const { migrateState } = await import('../store/migrations.js')
  const { stripTransient } = await import('../lib/crypto/index.js')
  const { visibleLangs } = await import('../lib/langs.js')
  const { runCli } = await import('./commands.js')
  const { startRepl } = await import('./repl.js')
  const { createPainter } = await import('./format.js')
  const { createCliSync } = await import('./sync.js')

  const saved = readJsonFile(STATE_FILE, null)
  const migrated = saved ? migrateState(saved) : null
  if (migrated && migrated.status !== 'invalid' && migrated.status !== 'newer') useStore.getState().hydrateState(migrated.state)
  else useStore.getState().markHydrated()
  if (!saved) useStore.setState({ lang: systemLang(visibleLangs()), onboardingDone: true })

  const paint = createPainter(process.stdout.isTTY && !process.env.NO_COLOR)
  const sync = createCliSync({ store: useStore, readText, paint })
  const save = () => writeJsonFile(STATE_FILE, stripTransient(useStore.getState()))

  const env = {
    store: useStore,
    now: () => new Date(),
    print: line => process.stdout.write(`${line}\n`),
    paint,
    sync,
    lastAction: {
      get: () => readJsonFile(LAST_ACTION_FILE, null),
      set: value => writeJsonFile(LAST_ACTION_FILE, value),
    },
    readFile: file => fs.readFileSync(file, 'utf8'),
    writeFile: (file, text) => fs.writeFileSync(file, text),
  }

  const pullQuietly = async () => {
    if (!sync.isConnected()) return
    try { await sync.pull() } catch (err) { env.print(paint.dim(sync.describe(err))) }
  }
  const persistAndPush = async () => {
    save()
    if (!sync.isConnected()) return
    try { await sync.push() } catch (err) { env.print(sync.describe(err)) }
  }

  const argv = process.argv.slice(2)
  if (!argv.length && process.stdin.isTTY) {
    await pullQuietly()
    await startRepl({ env, runCli, onChange: persistAndPush })
    save()
    process.exit(0)
  }

  if (!QUIET_COMMANDS.has(argv[0])) await pullQuietly()
  const code = await runCli(argv, env)
  if (env.changed) await persistAndPush()
  else save()
  process.exit(code)
}

main().catch(err => {
  process.stderr.write(`${err?.stack ?? err}\n`)
  process.exit(1)
})
