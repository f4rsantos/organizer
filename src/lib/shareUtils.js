import {
  encryptWithKey, decryptWithKey, importRawKey, generateRawKeyString,
  toBase64Url, fromBase64Url, aadForShare, aadForExport, WHOLE_STATE,
  encryptForSlot, isEnvelope, DATA_SLICES, META_KEYS,
} from './crypto'
import { getSecureBaseUrl } from './urlBase'

export const SHARE_FORMAT = 'amber-plum'
const SHARE_FORMATS = [SHARE_FORMAT, 'organizer-share-1']

function encodeJson(value) {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

function decodeJson(encoded) {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)))
}

export function pickShareableState(state) {
  const picked = {}
  for (const key of [...META_KEYS, ...DATA_SLICES]) {
    if (state?.[key] !== undefined) picked[key] = state[key]
  }
  return picked
}

export async function encodeStateToUrl(state) {
  const keyString = generateRawKeyString()
  const key = await importRawKey(keyString)
  const payload = await encryptWithKey(key, pickShareableState(state), aadForShare())

  const container = encodeJson({ format: SHARE_FORMAT, payload })

  const secret = toBase64Url(new TextEncoder().encode(keyString))

  return `${getSecureBaseUrl()}#s=${container}&sk=${secret}`
}

export async function decodeStateFromUrl() {
  const hash = location.hash
  if (!hash.startsWith('#s=')) return null

  try {
    const params = new URLSearchParams(hash.slice(1))
    const container = params.get('s')
    const secret = params.get('sk')
    if (!container || !secret) return null

    const parsed = decodeJson(container)
    if (!SHARE_FORMATS.includes(parsed?.format) || !parsed?.payload) return null

    const keyString = new TextDecoder().decode(fromBase64Url(secret))
    const key = await importRawKey(keyString)
    const state = await decryptWithKey(key, parsed.payload, aadForShare())
    if (!state?.version) return null
    return state
  } catch {
    return null
  }
}

export function clearUrlHash() {
  history.replaceState(null, '', location.pathname)
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportEncryptedState(state, keyString) {
  const envelope = await encryptForSlot(state, keyString, aadForExport(WHOLE_STATE))
  downloadJson(envelope, 'organizer-backup.encrypted.json')
}

export function exportPlaintextState(state) {
  downloadJson(pickShareableState(state), 'organizer-backup.json')
}

export { isEnvelope }
