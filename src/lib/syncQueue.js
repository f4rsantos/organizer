export function createSyncQueue(initial = {}) {
  return {
    hasPulled: initial.hasPulled === true,
    remoteNewer: initial.remoteNewer === true,
    pendingPush: false,
  }
}

export function requestPush(queue) {
  if (queue.remoteNewer) return 'blocked'
  if (!queue.hasPulled) {
    queue.pendingPush = true
    return 'deferred'
  }
  return 'send'
}

export function markPulled(queue, { remoteNewer = false } = {}) {
  queue.hasPulled = true
  queue.remoteNewer = remoteNewer
  if (remoteNewer) return false
  if (!queue.pendingPush) return false
  queue.pendingPush = false
  return true
}

export function markPushed(queue) {
  queue.pendingPush = false
}
