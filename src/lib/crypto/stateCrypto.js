import { encryptWithKey, decryptWithKey } from './envelope'
import { importRawKey } from './rawKey'

export async function encryptForSlot(value, keyString, aad) {
  return encryptWithKey(await importRawKey(keyString), value, aad)
}

export async function decryptForSlot(envelope, keyString, aad) {
  return decryptWithKey(await importRawKey(keyString), envelope, aad)
}
