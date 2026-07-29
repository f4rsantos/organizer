import { encryptForSlot, aadForExport, WHOLE_STATE, isEnvelope } from './crypto'
import { getSecureBaseUrl } from './urlBase'

export function encodeStateToUrl(state) {
  const json = JSON.stringify(state)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return `${getSecureBaseUrl()}#data=${b64}`
}

export function decodeStateFromUrl() {
  const hash = location.hash
  if (!hash.startsWith('#data=')) return null
  try {
    const json = decodeURIComponent(escape(atob(hash.slice(6))))
    const data = JSON.parse(json)
    if (!data.version) throw new Error('Invalid')
    return data
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
  downloadJson(state, 'organizer-backup.json')
}

export { isEnvelope }
