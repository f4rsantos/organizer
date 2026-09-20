import { describe, it, expect } from 'vitest'
import { createSyncQueue, requestPush, markPulled, markPushed } from '../../src/lib/syncQueue'

describe('createSyncQueue', () => {
  it('defaults to an unpulled queue with nothing pending', () => {
    const queue = createSyncQueue()
    expect(queue).toEqual({ hasPulled: false, remoteNewer: false, pendingPush: false })
  })

  it('starts pulled when boot already completed a sync', () => {
    expect(createSyncQueue({ hasPulled: true }).hasPulled).toBe(true)
  })
})

describe('requestPush', () => {
  it('sends once a pull has completed', () => {
    const queue = createSyncQueue({ hasPulled: true })
    expect(requestPush(queue)).toBe('send')
    expect(queue.pendingPush).toBe(false)
  })

  it('defers and remembers a save made before the first pull lands', () => {
    const queue = createSyncQueue()
    expect(requestPush(queue)).toBe('deferred')
    expect(queue.pendingPush).toBe(true)
  })

  it('blocks without queueing when the remote is a newer schema', () => {
    const queue = createSyncQueue({ hasPulled: true, remoteNewer: true })
    expect(requestPush(queue)).toBe('blocked')
    expect(queue.pendingPush).toBe(false)
  })
})

describe('markPulled', () => {
  it('flushes a save that was deferred before the first pull', () => {
    const queue = createSyncQueue()
    requestPush(queue)
    expect(markPulled(queue)).toBe(true)
    expect(queue.pendingPush).toBe(false)
    expect(requestPush(queue)).toBe('send')
  })

  it('does not flush when nothing was deferred', () => {
    const queue = createSyncQueue()
    expect(markPulled(queue)).toBe(false)
  })

  it('keeps a deferred save queued when the remote is newer', () => {
    const queue = createSyncQueue()
    requestPush(queue)
    expect(markPulled(queue, { remoteNewer: true })).toBe(false)
    expect(queue.pendingPush).toBe(true)
  })

  it('clears remoteNewer when a later pull is compatible again', () => {
    const queue = createSyncQueue()
    markPulled(queue, { remoteNewer: true })
    expect(requestPush(queue)).toBe('blocked')
    markPulled(queue)
    expect(requestPush(queue)).toBe('send')
  })
})

describe('markPushed', () => {
  it('clears the pending flag after a successful send', () => {
    const queue = createSyncQueue()
    requestPush(queue)
    markPushed(queue)
    expect(queue.pendingPush).toBe(false)
  })
})

describe('save before first pull regression', () => {
  it('never silently drops a task saved while the boot pull is still in flight', () => {
    const queue = createSyncQueue()
    expect(requestPush(queue)).toBe('deferred')
    const shouldFlush = markPulled(queue)
    expect(shouldFlush).toBe(true)
    expect(requestPush(queue)).toBe('send')
  })
})
