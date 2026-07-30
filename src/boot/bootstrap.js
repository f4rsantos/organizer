import { decodeStateFromUrl, clearUrlHash } from '../lib/shareUtils'
import { forceSaveState, hasEncryptedSnapshotAsync, hasLocalStateAsync } from '../store/persist'
import { migrateState } from '../store/migrations'
import { loadFirebaseConfig } from '../lib/firebaseConfig'
import { getEncMode, MODE_OFF } from '../lib/crypto'
import { loadStoredDek } from '../lib/crypto/encryptionService'

const REMOTE_TIMEOUT_MS = 6000

async function importFromUrl() {
  const urlData = await decodeStateFromUrl()
  if (!urlData) return
  const { state, status } = migrateState(urlData)
  if (status === 'ok' || status === 'migrated') await forceSaveState(state)
  clearUrlHash()
}

async function hydrateFromFirebase() {
  const config = loadFirebaseConfig()
  if (!config || await hasLocalStateAsync()) return

  try {
    const { pullFromFirebase } = await import('../lib/firebase')
    const remote = await Promise.race([
      pullFromFirebase(config),
      new Promise(resolve => setTimeout(() => resolve(null), REMOTE_TIMEOUT_MS)),
    ])

    if (!remote?.version) return
    const { state, status } = migrateState(remote)
    if (status === 'newer') sessionStorage.setItem('organizer:remote-newer', '1')
    else if (status !== 'invalid') await forceSaveState(state)
  } catch {
    return
  }
}

export async function runBootstrap() {
  const mode = getEncMode()
  const locked = await hasEncryptedSnapshotAsync()

  if (mode === MODE_OFF && !locked) {
    await importFromUrl()
    await hydrateFromFirebase()
    return { mode, dek: null, needsUnlock: false, storeError: null }
  }

  let dek = null
  let storeError = null
  try {
    dek = await loadStoredDek()
  } catch (err) {
    storeError = err?.message ?? 'key-store-unavailable'
  }

  if (!dek && locked) {
    return { mode, dek: null, needsUnlock: true, storeError }
  }

  await importFromUrl()
  await hydrateFromFirebase()
  return { mode, dek, needsUnlock: false, storeError: null }
}

export async function resumeBootstrap() {
  await importFromUrl()
  await hydrateFromFirebase()
}
