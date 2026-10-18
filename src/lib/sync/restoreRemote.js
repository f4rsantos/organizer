import { migrateState } from '../../store/migrations.js'

export const RESTORE_TIMEOUT = 'restore-timeout'
const DEFAULT_TIMEOUT_MS = 15000

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(RESTORE_TIMEOUT)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export async function restoreFromRemote({ config, pull, importData, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const pulled = await withTimeout(pull(config), timeoutMs)
  const remote = pulled?.state
  const rev = pulled?.rev ?? 0
  if (!remote?.version) return { status: 'empty', rev }
  const { status } = migrateState(remote)
  if (status === 'newer' || status === 'invalid') return { status, rev }
  importData(remote, { preferLocalSettings: false, syncScope: config.projectId })
  return { status: 'restored', rev }
}
