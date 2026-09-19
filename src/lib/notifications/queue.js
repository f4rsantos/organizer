export function emptyNotificationQueue() {
  return { toasts: [], unread: [], activeAlert: null }
}

function withoutTag(list, tag) {
  if (!tag) return list
  return list.filter(entry => entry.tag !== tag)
}

export function enqueueNotification(queue, entry, intrusiveness) {
  const q = queue ?? emptyNotificationQueue()
  const normalized = {
    id: entry.id,
    tag: entry.tag ?? null,
    source: entry.source ?? null,
    title: entry.title ?? '',
    body: entry.body ?? '',
    createdAt: entry.createdAt ?? Date.now(),
  }

  if (intrusiveness === 'alert') {
    return { ...q, activeAlert: normalized }
  }

  return { ...q, toasts: [...withoutTag(q.toasts, normalized.tag), normalized] }
}

export function dismissToast(queue, id) {
  const q = queue ?? emptyNotificationQueue()
  const toast = q.toasts.find(t => t.id === id)
  if (!toast) return q
  return {
    ...q,
    toasts: q.toasts.filter(t => t.id !== id),
    unread: [...withoutTag(q.unread, toast.tag), toast],
  }
}

export function dismissActiveAlert(queue) {
  const q = queue ?? emptyNotificationQueue()
  return { ...q, activeAlert: null }
}

export function clearUnread(queue, id) {
  const q = queue ?? emptyNotificationQueue()
  return { ...q, unread: q.unread.filter(entry => entry.id !== id) }
}

export function clearAllUnread(queue) {
  const q = queue ?? emptyNotificationQueue()
  return { ...q, unread: [] }
}

export function hasUnread(queue) {
  return ((queue?.unread?.length) ?? 0) > 0
}
