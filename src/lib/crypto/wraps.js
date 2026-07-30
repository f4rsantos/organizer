import { toBase64, fromBase64, randomBytes, zeroFill } from './bytes'
import { deriveWrappingKey, KDF_DEFAULT, SALT_BYTES } from './kdf'
import { aadForWrap } from './aad'
import { importDekFromRaw, computeDekId } from './keyStore'
import { encodeMnemonic, decodeMnemonic, normalizeMnemonic, generateRecoveryEntropy } from './mnemonic'

export const SLOT_PASSPHRASE = 'passphrase'
export const SLOT_RECOVERY_CODE = 'recoveryCode'
export const SLOTS = [SLOT_PASSPHRASE, SLOT_RECOVERY_CODE]

const ALGO = 'AES-GCM'
const IV_BYTES = 12
const DEK_BYTES = 32

function slotAad(slot) {
  return new TextEncoder().encode(aadForWrap(slot))
}

async function normalizeSecret(slot, secret) {
  if (slot !== SLOT_RECOVERY_CODE) return secret
  const entropy = await decodeMnemonic(secret)
  if (!entropy) throw new Error('wrap-unlock-failed')
  zeroFill(entropy)
  return normalizeMnemonic(secret)
}

async function wrapRaw(raw, secret, slot, params) {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const wrappingKey = await deriveWrappingKey(secret, salt, params)
  const wrapped = await crypto.subtle.encrypt(
    { name: ALGO, iv, additionalData: slotAad(slot) }, wrappingKey, raw,
  )
  return {
    kdf: { ...params },
    salt: toBase64(salt),
    iv: toBase64(iv),
    wrapped: toBase64(new Uint8Array(wrapped)),
  }
}

function hasSlot(wraps, slot) {
  const record = wraps?.[slot]
  return Boolean(record && typeof record.salt === 'string'
    && typeof record.iv === 'string' && typeof record.wrapped === 'string')
}

export function availableSlots(wraps) {
  return SLOTS.filter(slot => hasSlot(wraps, slot))
}

export function hasAnySlot(wraps) {
  return availableSlots(wraps).length > 0
}

export async function unwrapDekRaw(wraps, slot, secret) {
  if (!hasSlot(wraps, slot)) throw new Error('wrap-slot-missing')
  const record = wraps[slot]
  const normalized = await normalizeSecret(slot, secret)
  try {
    const wrappingKey = await deriveWrappingKey(
      normalized, fromBase64(record.salt), record.kdf ?? KDF_DEFAULT,
    )
    const raw = new Uint8Array(await crypto.subtle.decrypt(
      { name: ALGO, iv: fromBase64(record.iv), additionalData: slotAad(slot) },
      wrappingKey,
      fromBase64(record.wrapped),
    ))
    if (raw.length !== DEK_BYTES) throw new Error('wrap-unlock-failed')
    return raw
  } catch {
    throw new Error('wrap-unlock-failed')
  }
}

async function adoptRaw(raw) {
  return { dek: await importDekFromRaw(raw), dekId: await computeDekId(raw) }
}

export async function unwrapDek(wraps, slot, secret) {
  const raw = await unwrapDekRaw(wraps, slot, secret)
  try {
    return await adoptRaw(raw)
  } finally {
    zeroFill(raw)
  }
}

export async function createWraps({ passphrase, hint, params = KDF_DEFAULT, raw } = {}) {
  const ownsRaw = !raw
  const dekRaw = raw ?? randomBytes(DEK_BYTES)
  const recoveryEntropy = generateRecoveryEntropy()
  try {
    const recoveryCode = await encodeMnemonic(recoveryEntropy)
    const wraps = {
      [SLOT_PASSPHRASE]: await wrapRaw(dekRaw, passphrase, SLOT_PASSPHRASE, params),
      [SLOT_RECOVERY_CODE]: await wrapRaw(dekRaw, recoveryCode, SLOT_RECOVERY_CODE, params),
    }
    if (hint) wraps.hint = String(hint)
    return { wraps, recoveryCode, ...(await adoptRaw(dekRaw)) }
  } finally {
    zeroFill(recoveryEntropy)
    if (ownsRaw) zeroFill(dekRaw)
  }
}

export async function rewrapSlot({ wraps, raw, slot, secret, params = KDF_DEFAULT }) {
  if (!SLOTS.includes(slot)) throw new Error('wrap-slot-unknown')
  const next = { ...wraps }

  if (slot !== SLOT_RECOVERY_CODE) {
    next[slot] = await wrapRaw(raw, secret, slot, params)
    return { wraps: next, recoveryCode: null }
  }

  const entropy = generateRecoveryEntropy()
  try {
    const recoveryCode = await encodeMnemonic(entropy)
    next[slot] = await wrapRaw(raw, recoveryCode, slot, params)
    return { wraps: next, recoveryCode }
  } finally {
    zeroFill(entropy)
  }
}

export function setHint(wraps, hint) {
  const next = { ...wraps }
  if (hint) next.hint = String(hint)
  else delete next.hint
  return next
}

export function getHint(wraps) {
  return typeof wraps?.hint === 'string' && wraps.hint ? wraps.hint : null
}
