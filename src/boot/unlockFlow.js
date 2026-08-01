import { loadFirebaseConfig } from '../lib/firebaseConfig'
import { unlockWithSecret } from '../lib/crypto/encryptionService'
import { getEncMode, loadLocalWraps, hasAnySlot, MODE_OFF, MODE_SYNC } from '../lib/crypto'

export async function loadPersonalWraps() {
  const local = loadLocalWraps()
  if (hasAnySlot(local)) return local

  const config = loadFirebaseConfig()
  if (!config) return null

  try {
    const { fetchStateWraps } = await import('../lib/firebase')
    return await fetchStateWraps(config)
  } catch {
    return null
  }
}

export async function unlockPersonal({ wraps, slot, secret, expectedDekId = null }) {
  if (!wraps) throw new Error('wrap-slot-missing')
  const mode = getEncMode()
  return unlockWithSecret({
    wraps,
    slot,
    secret,
    expectedDekId,
    mode: mode === MODE_OFF ? MODE_SYNC : mode,
  })
}
