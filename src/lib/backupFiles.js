import { aadForExport, WHOLE_STATE, encryptForSlot, DATA_SLICES, META_KEYS } from './crypto'

function pickShareableState(state) {
  const picked = {}
  for (const key of [...META_KEYS, ...DATA_SLICES]) {
    if (state?.[key] !== undefined) picked[key] = state[key]
  }
  return picked
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
