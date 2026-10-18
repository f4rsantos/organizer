import {
  clearFirebaseConfig, loadFirebaseConfig, pullFromFirebase, pushToFirebase, saveFirebaseConfig, validateFirebaseConfig,
} from '../lib/firebase.js'
import { parseFirebaseConfig } from '../lib/firebaseConfig.js'
import { describeFirebaseError } from '../lib/firebaseErrors.js'
import { migrateState } from '../store/migrations.js'
import { createSyncBase } from '../lib/sync/syncBase.js'
import { serializableSyncState } from '../lib/sync/serializable.js'
import { getStrings } from '../lib/strings/index.js'

const BASE_REV_KEY = 'organizer-cli:baseRev'
const PULL_TIMEOUT_MS = 10000

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('restore-timeout')), ms) })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export function createCliSync({ store, readText, paint }) {
  const t = () => getStrings(store.getState().lang ?? 'en')

  const pull = async () => {
    const config = loadFirebaseConfig()
    if (!config) return null
    const pulled = await withTimeout(pullFromFirebase(config), PULL_TIMEOUT_MS)
    localStorage.setItem(BASE_REV_KEY, String(pulled?.rev ?? 0))
    if (!pulled?.state?.version) return 'empty'
    const { state, status } = migrateState(pulled.state)
    if (status === 'newer' || status === 'invalid') return status
    store.getState().importData(state, { syncScope: config.projectId })
    return 'pulled'
  }

  const push = async () => {
    const config = loadFirebaseConfig()
    if (!config) return null
    const payload = serializableSyncState(store.getState())
    const baseRev = Number(localStorage.getItem(BASE_REV_KEY) ?? 0)
    const rev = await pushToFirebase(config, payload, { baseRev })
    if (rev !== null) localStorage.setItem(BASE_REV_KEY, String(rev))
    store.getState().setSyncBase(createSyncBase(config.projectId, payload))
    return 'pushed'
  }

  const connect = async file => {
    const parsed = parseFirebaseConfig(await readText(file))
    if (!parsed) return paint.red(t().firebaseConfigInvalid)
    const remote = await validateFirebaseConfig(parsed)
    if (remote.encrypted) return paint.red(t().cliSyncEncrypted)
    saveFirebaseConfig(parsed)
    await pull()
    return paint.green(`✓ ${t().firebaseConnected} · ${parsed.projectId}`)
  }

  const describe = err => paint.red(err?.message === 'restore-timeout' ? t().obRestoreTimeout : describeFirebaseError(err, t()))

  const run = async (sub, { file } = {}) => {
    try {
      if (sub === 'connect') return await connect(file)
      if (sub === 'disconnect') { clearFirebaseConfig(); return paint.green(`✓ ${t().firebaseDisconnect}`) }
      if (!loadFirebaseConfig()) return paint.dim(t().cliSyncNotConnected)
      if (sub === 'pull') return paint.green(`✓ ${await pull()}`)
      if (sub === 'push') return paint.green(`✓ ${await push()}`)
      return `${t().firebaseConnected} · ${loadFirebaseConfig().projectId}`
    } catch (err) {
      return describe(err)
    }
  }

  return { run, pull, push, describe, isConnected: () => Boolean(loadFirebaseConfig()) }
}
