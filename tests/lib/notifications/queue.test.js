import { describe, it, expect } from 'vitest'
import {
  emptyNotificationQueue,
  enqueueNotification,
  dismissToast,
  readToast,
  dismissActiveAlert,
  clearUnread,
  clearAllUnread,
  hasUnread,
} from '@/lib/notifications/queue'

describe('emptyNotificationQueue', () => {
  it('starts with empty toasts, unread and no active alert', () => {
    expect(emptyNotificationQueue()).toEqual({ toasts: [], unread: [], activeAlert: null })
  })
})

describe('enqueueNotification', () => {
  it('adds a toast in toast mode', () => {
    const q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'toast')
    expect(q.toasts).toHaveLength(1)
    expect(q.toasts[0].title).toBe('Hi')
    expect(q.activeAlert).toBeNull()
  })

  it('sets the active alert in alert mode instead of stacking a toast', () => {
    const q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'alert')
    expect(q.toasts).toEqual([])
    expect(q.activeAlert).toMatchObject({ id: 'a', title: 'Hi' })
  })

  it('replaces an existing alert rather than accumulating one', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'First' }, 'alert')
    q = enqueueNotification(q, { id: 'b', title: 'Second' }, 'alert')
    expect(q.activeAlert).toMatchObject({ id: 'b', title: 'Second' })
  })

  it('deduplicates toasts sharing a tag, keeping the newest', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', tag: 'x', title: 'Old' }, 'toast')
    q = enqueueNotification(q, { id: 'b', tag: 'x', title: 'New' }, 'toast')
    expect(q.toasts).toHaveLength(1)
    expect(q.toasts[0].id).toBe('b')
  })
})

describe('dismissToast', () => {
  it('moves a dismissed toast into unread', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'toast')
    q = dismissToast(q, 'a')
    expect(q.toasts).toEqual([])
    expect(q.unread).toHaveLength(1)
    expect(q.unread[0].id).toBe('a')
  })

  it('is a no-op for an unknown id', () => {
    const q = emptyNotificationQueue()
    expect(dismissToast(q, 'missing')).toBe(q)
  })

  it('deduplicates unread entries by tag', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', tag: 'x', title: 'Old' }, 'toast')
    q = dismissToast(q, 'a')
    q = enqueueNotification(q, { id: 'b', tag: 'x', title: 'New' }, 'toast')
    q = dismissToast(q, 'b')
    expect(q.unread).toHaveLength(1)
    expect(q.unread[0].id).toBe('b')
  })
})

describe('readToast', () => {
  it('removes the toast without adding it to unread', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'toast')
    q = readToast(q, 'a')
    expect(q.toasts).toEqual([])
    expect(q.unread).toEqual([])
  })

  it('clears stale unread entries sharing the read toast tag', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', tag: 'focus', title: 'Break' }, 'toast')
    q = dismissToast(q, 'a')
    q = enqueueNotification(q, { id: 'b', tag: 'focus', title: 'Focus' }, 'toast')
    q = readToast(q, 'b')
    expect(q.toasts).toEqual([])
    expect(q.unread).toEqual([])
  })

  it('keeps unread entries with a different tag', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', tag: 'task', title: 'Due' }, 'toast')
    q = dismissToast(q, 'a')
    q = enqueueNotification(q, { id: 'b', tag: 'focus', title: 'Break' }, 'toast')
    q = readToast(q, 'b')
    expect(q.unread.map(entry => entry.id)).toEqual(['a'])
  })

  it('keeps untagged unread entries when reading an untagged toast', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'One' }, 'toast')
    q = dismissToast(q, 'a')
    q = enqueueNotification(q, { id: 'b', title: 'Two' }, 'toast')
    q = readToast(q, 'b')
    expect(q.unread.map(entry => entry.id)).toEqual(['a'])
  })

  it('is a no-op for an unknown id', () => {
    const q = emptyNotificationQueue()
    expect(readToast(q, 'missing')).toEqual(q)
  })
})

describe('dismissActiveAlert', () => {
  it('clears the active alert without touching toasts/unread', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'alert')
    q = dismissActiveAlert(q)
    expect(q.activeAlert).toBeNull()
  })
})

describe('clearUnread / clearAllUnread', () => {
  it('removes a single unread entry by id', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'toast')
    q = dismissToast(q, 'a')
    q = clearUnread(q, 'a')
    expect(q.unread).toEqual([])
  })

  it('clears every unread entry', () => {
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'toast')
    q = dismissToast(q, 'a')
    q = enqueueNotification(q, { id: 'b', title: 'Bye' }, 'toast')
    q = dismissToast(q, 'b')
    q = clearAllUnread(q)
    expect(q.unread).toEqual([])
  })
})

describe('hasUnread', () => {
  it('is false for an empty queue and true once something is unread', () => {
    expect(hasUnread(emptyNotificationQueue())).toBe(false)
    let q = enqueueNotification(emptyNotificationQueue(), { id: 'a', title: 'Hi' }, 'toast')
    q = dismissToast(q, 'a')
    expect(hasUnread(q)).toBe(true)
  })
})
