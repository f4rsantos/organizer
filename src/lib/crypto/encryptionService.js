import { zeroFill } from './bytes'
import { openDekStore, getDek, putDek, clearDek, setCachedDek, getCachedDek, importDekFromRaw, computeDekId, generateDekBytes } from './keyStore'
import { createWraps, unwrapDekRaw, rewrapSlot, SLOT_PASSPHRASE, SLOT_RECOVERY_CODE } from './wraps'
import {
  getEncMode, setEncMode, saveDekId, clearDekId,
  wasEncryptionEverEnabled, MODE_OFF, MODE_LOCAL, MODE_SYNC,
} from './keyState'
import { clearProjection } from '@/lib/widgets/bridge'

const STORE_TIMEOUT_MS = 4000

export function isUnlocked() {
  return getCachedDek() !== null
}

export function needsUnlock() {
  return getEncMode() !== MODE_OFF && !isUnlocked()
}

export async function openStore() {
  return Promise.race([
    openDekStore(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('key-store-unavailable')), STORE_TIMEOUT_MS)),
  ])
}

export async function loadStoredDek() {
  await openStore()
  return getDek()
}

export async function prepareEnable({ passphrase, hint, mode = MODE_SYNC }) {
  const raw = generateDekBytes()
  try {
    const created = await createWraps({ passphrase, hint, raw })
    return {
      wraps: created.wraps,
      recoveryCode: created.recoveryCode,
      dek: created.dek,
      dekId: created.dekId,
      mode,
      commit: async () => {
        await openStore()
        await putDek(created.dek)
        saveDekId(created.dekId)
        setEncMode(mode)
      },
    }
  } finally {
    zeroFill(raw)
  }
}

export async function unlockWithSecret({ wraps, slot, secret, mode = MODE_SYNC, expectedDekId = null }) {
  const raw = await unwrapDekRaw(wraps, slot, secret)
  try {
    const dekId = await computeDekId(raw)
    if (expectedDekId && dekId !== expectedDekId) throw new Error('dek-id-mismatch')
    const dek = await importDekFromRaw(raw)
    try {
      await openStore()
      await putDek(dek)
    } catch {
      setCachedDek(dek)
    }
    saveDekId(dekId)
    setEncMode(mode)
    return { dek, dekId }
  } finally {
    zeroFill(raw)
  }
}

export async function unlockWithPassphrase(options) {
  return unlockWithSecret({ ...options, slot: SLOT_PASSPHRASE })
}

export async function unlockWithRecoveryCode(options) {
  return unlockWithSecret({ ...options, slot: SLOT_RECOVERY_CODE })
}

export async function changePassphrase({ wraps, currentSlot, currentSecret, passphrase }) {
  const raw = await unwrapDekRaw(wraps, currentSlot, currentSecret)
  try {
    return await rewrapSlot({ wraps, raw, slot: SLOT_PASSPHRASE, secret: passphrase })
  } finally {
    zeroFill(raw)
  }
}

export async function regenerateRecoveryCode({ wraps, currentSlot, currentSecret }) {
  const raw = await unwrapDekRaw(wraps, currentSlot, currentSecret)
  try {
    return await rewrapSlot({ wraps, raw, slot: SLOT_RECOVERY_CODE })
  } finally {
    zeroFill(raw)
  }
}

export async function disableEncryption() {
  try {
    await clearDek()
  } catch {
    setCachedDek(null)
  }
  clearDekId()
  setEncMode(MODE_OFF)
  await clearProjection()
}

export { MODE_OFF, MODE_LOCAL, MODE_SYNC, SLOT_PASSPHRASE, SLOT_RECOVERY_CODE, wasEncryptionEverEnabled }
