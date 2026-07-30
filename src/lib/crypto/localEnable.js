import { prepareEnable, changePassphrase, regenerateRecoveryCode, disableEncryption, unlockWithSecret } from './encryptionService'
import { setHint, unwrapDekRaw } from './wraps'
import { MODE_LOCAL, MODE_SYNC, loadLocalWraps, saveLocalWraps, clearLocalWraps, getEncMode } from './keyState'

export function readLocalWraps() {
  return loadLocalWraps()
}

export async function enableLocalEncryption({ passphrase, hint, resave, syncTarget = null }) {
  const mode = syncTarget ? MODE_SYNC : MODE_LOCAL
  const prepared = await prepareEnable({ passphrase, hint, mode })

  if (!saveLocalWraps(prepared.wraps)) throw new Error('local-wraps-write-failed')

  try {
    if (syncTarget) {
      await syncTarget.pushContainer({
        state: syncTarget.state,
        dek: prepared.dek,
        wraps: prepared.wraps,
        dekId: prepared.dekId,
      })
    }
    await prepared.commit()
    await resave()
  } catch (err) {
    clearLocalWraps()
    throw err
  }

  return { recoveryCode: prepared.recoveryCode, wraps: prepared.wraps, dekId: prepared.dekId }
}

export async function unlockLocal({ slot, secret }) {
  const wraps = loadLocalWraps()
  if (!wraps) throw new Error('wrap-slot-missing')
  return unlockWithSecret({ wraps, slot, secret, mode: getEncMode() })
}

export async function changeLocalPassphrase({ currentSlot, currentSecret, passphrase }) {
  const wraps = loadLocalWraps()
  const result = await changePassphrase({ wraps, currentSlot, currentSecret, passphrase })
  saveLocalWraps(result.wraps)
  return result
}

export async function regenerateLocalRecoveryCode({ currentSlot, currentSecret }) {
  const wraps = loadLocalWraps()
  const result = await regenerateRecoveryCode({ wraps, currentSlot, currentSecret })
  saveLocalWraps(result.wraps)
  return result
}

export function updateLocalHint(hint) {
  const wraps = loadLocalWraps()
  const next = setHint(wraps, hint)
  saveLocalWraps(next)
  return next
}

export async function rotateLocalKey({ currentSlot, currentSecret, passphrase, resave }) {
  const previous = loadLocalWraps()
  if (!previous) throw new Error('wrap-slot-missing')

  await unwrapDekRaw(previous, currentSlot, currentSecret)

  const prepared = await prepareEnable({ passphrase, hint: previous.hint, mode: MODE_LOCAL })
  if (!saveLocalWraps(prepared.wraps)) throw new Error('local-wraps-write-failed')

  try {
    await prepared.commit()
    await resave()
  } catch (err) {
    saveLocalWraps(previous)
    throw err
  }

  return { recoveryCode: prepared.recoveryCode, dekId: prepared.dekId, wraps: prepared.wraps }
}

export async function disableLocalEncryption({ resave }) {
  await disableEncryption()
  clearLocalWraps()
  await resave()
}
