import { prepareEnable, changePassphrase, regenerateRecoveryCode } from './encryptionService'
import { setHint } from './wraps'
import { MODE_SYNC } from './keyState'
import { rotateAndPublish } from './rotation'
import { aadForPersonalSlice } from './aad'

export async function enableSyncEncryption({ passphrase, hint, state, pushContainer }) {
  const prepared = await prepareEnable({ passphrase, hint, mode: MODE_SYNC })

  await pushContainer({
    state,
    dek: prepared.dek,
    wraps: prepared.wraps,
    dekId: prepared.dekId,
  })

  await prepared.commit()

  return { recoveryCode: prepared.recoveryCode, wraps: prepared.wraps, dekId: prepared.dekId }
}

export async function updatePassphrase({ wraps, currentSlot, currentSecret, passphrase, pushWraps }) {
  const result = await changePassphrase({ wraps, currentSlot, currentSecret, passphrase })
  await pushWraps(result.wraps)
  return result
}

export async function replaceRecoveryCode({ wraps, currentSlot, currentSecret, pushWraps }) {
  const result = await regenerateRecoveryCode({ wraps, currentSlot, currentSecret })
  await pushWraps(result.wraps)
  return result
}

export async function updateHint({ wraps, hint, pushWraps }) {
  const next = setHint(wraps, hint)
  await pushWraps(next)
  return next
}

export async function rotateSyncKey({
  container, wraps, currentSlot, currentSecret, passphrase, publishRotation, commitDek,
}) {
  return rotateAndPublish({
    container,
    wraps,
    currentSlot,
    currentSecret,
    passphrase,
    aadFor: aadForPersonalSlice,
    publish: publishRotation,
    commit: commitDek,
  })
}
