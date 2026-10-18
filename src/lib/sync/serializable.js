import { stripLocalSlices, stripTransient } from '../crypto/index.js'
import { toSyncedView } from './syncBase.js'

export function serializableSyncState(state) {
  return JSON.parse(JSON.stringify(toSyncedView(stripLocalSlices(stripTransient(state)))))
}
