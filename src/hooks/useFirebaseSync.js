import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadFirebaseConfig, pushToFirebase, pullFromFirebase, REV_CONFLICT } from '@/lib/firebase'
import { migrateState } from '@/store/migrations'
import { stripTransient } from '@/lib/crypto'
import { createSyncQueue, requestPush, markPulled, markPushed } from '@/lib/syncQueue'

const PULL_INTERVAL_MS = 5 * 60 * 1000
const PUSH_DEBOUNCE_MS = 1000
const PULL_GATE_MS = 30 * 1000

function getSerializableState() {
  return JSON.parse(JSON.stringify(stripTransient(useStore.getState())))
}

const KEY_ERRORS = new Set(['encryption-key-required', 'dek-id-mismatch'])

let initialSyncRev = null
let initialSyncDone = false

export function setInitialSyncRev(rev) {
  initialSyncRev = rev
  initialSyncDone = true
}

export function getInitialSyncRev() {
  return initialSyncRev
}

export function resetInitialSyncRevForTests() {
  initialSyncRev = null
  initialSyncDone = false
}

export function useFirebaseSync() {
  const importData = useStore(s => s.importData)
  const hydrated = useStore(s => s.hydrated === true)
  const refs = useRef({
    pushTimeout: null,
    isPulling: false,
    lastLocalUpdateAt: 0,
    lastPullAt: initialSyncDone ? Date.now() : 0,
    retryingConflict: false,
    baseRev: initialSyncRev,
    isImporting: false,
    queue: createSyncQueue({ hasPulled: initialSyncDone }),
  })
  const [status, setStatus] = useState(initialSyncDone ? 'ok' : 'idle')

  const pull = useCallback(async ({ force = true } = {}) => {
    if (!hydrated) return
    if (refs.current.isPulling) return
    if (!force && Date.now() - refs.current.lastPullAt < PULL_GATE_MS) return
    const config = loadFirebaseConfig()
    if (!config) return
    refs.current.isPulling = true
    const pullStartTime = Date.now()
    try {
      setStatus('syncing')
      const pulled = await pullFromFirebase(config)
      const remote = pulled?.state

      if (refs.current.lastLocalUpdateAt > pullStartTime) {
        setStatus('ok')
        return
      }

      refs.current.baseRev = pulled?.rev ?? 0

      let remoteNewer = false
      if (remote?.version) {
        const { state, status: migration } = migrateState(remote)
        remoteNewer = migration === 'newer'
        if (!remoteNewer && migration !== 'invalid') {
          refs.current.isImporting = true
          try {
            importData(state)
          } finally {
            refs.current.isImporting = false
          }
        }
      }

      const shouldFlush = markPulled(refs.current.queue, { remoteNewer })
      if (remoteNewer) {
        setStatus('remote-newer')
        return
      }
      setStatus('ok')
      if (shouldFlush) refs.current.flushPending?.()
    } catch (err) {
      setStatus(KEY_ERRORS.has(err?.message) ? 'key-required' : 'error')
    } finally {
      refs.current.isPulling = false
      refs.current.lastPullAt = Date.now()
    }
  }, [importData, hydrated])

  const push = useCallback(async () => {
    if (!hydrated) return
    const config = loadFirebaseConfig()
    if (!config) return
    const intent = requestPush(refs.current.queue)
    if (intent !== 'send') return
    try {
      setStatus('syncing')
      const rev = await pushToFirebase(config, getSerializableState(), {
        baseRev: refs.current.baseRev,
      })
      if (rev !== null) refs.current.baseRev = rev
      markPushed(refs.current.queue)
      setStatus('ok')
    } catch (err) {
      if (err?.message === REV_CONFLICT && !refs.current.retryingConflict) {
        refs.current.retryingConflict = true
        refs.current.queue.pendingPush = true
        try {
          setStatus('conflict')
          await pull()
        } finally {
          refs.current.retryingConflict = false
        }
        return
      }
      refs.current.queue.pendingPush = true
      setStatus(KEY_ERRORS.has(err?.message) ? 'key-required' : 'error')
    }
  }, [hydrated, pull])

  const pushNow = useCallback(() => {
    clearTimeout(refs.current.pushTimeout)
    refs.current.pushTimeout = null
    void push()
  }, [push])

  refs.current.flushPending = pushNow

  const pullNow = useCallback(() => {
    void pull()
  }, [pull])

  const pullIfStale = useCallback(() => {
    void pull({ force: false })
  }, [pull])

  useEffect(() => {
    const tracked = refs.current
    const unsubscribe = useStore.subscribe(() => {
      if (tracked.isImporting) return
      tracked.lastLocalUpdateAt = Date.now()
      clearTimeout(tracked.pushTimeout)
      tracked.pushTimeout = setTimeout(push, PUSH_DEBOUNCE_MS)
    })
    return () => {
      unsubscribe()
      clearTimeout(tracked.pushTimeout)
      tracked.pushTimeout = null
    }
  }, [push])

  useEffect(() => {
    const flush = () => {
      if (refs.current.pushTimeout) pushNow()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
      else if (document.visibilityState === 'visible') pullIfStale()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [pushNow, pullIfStale])

  useEffect(() => {
    window.addEventListener('focus', pullIfStale)
    window.addEventListener('online', pullNow)
    return () => {
      window.removeEventListener('focus', pullIfStale)
      window.removeEventListener('online', pullNow)
    }
  }, [pullIfStale, pullNow])

  useEffect(() => {
    const id = setInterval(pullNow, PULL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pullNow])

  useEffect(() => {
    if (!refs.current.hasPulled || Date.now() - refs.current.lastPullAt >= PULL_GATE_MS) {
      pullNow()
    }
  }, [pullNow])

  return { status, pullNow, pullIfStale }
}
