import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadFirebaseConfig, pushToFirebase, pullFromFirebase, REV_CONFLICT } from '@/lib/firebase'
import { migrateState } from '@/store/migrations'
import { stripTransient, stripLocalSlices } from '@/lib/crypto'

const PULL_INTERVAL_MS = 5 * 60 * 1000
const PUSH_DEBOUNCE_MS = 1000
const PULL_GATE_MS = 30 * 1000

function getSerializableState() {
  return JSON.parse(JSON.stringify(stripLocalSlices(stripTransient(useStore.getState()))))
}

const KEY_ERRORS = new Set(['encryption-key-required', 'dek-id-mismatch'])

export function useFirebaseSync() {
  const importData = useStore(s => s.importData)
  const hydrated = useStore(s => s.hydrated === true)
  const refs = useRef({
    pushTimeout: null,
    isPulling: false,
    remoteNewer: false,
    lastLocalUpdateAt: 0,
    lastPullAt: 0,
    retryingConflict: false,
    // Revision of the remote doc this device last read. Until a pull succeeds
    // it is null, which blocks pushing: local state is whatever was on disk at
    // boot, so pushing it would overwrite newer work from another device.
    baseRev: null,
    hasPulled: false,
  })
  const [status, setStatus] = useState('idle')

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

      // An empty remote is still a successful read: this device now knows the
      // doc's revision (0) and may push its local state to seed it.
      refs.current.baseRev = pulled?.rev ?? 0
      refs.current.hasPulled = true

      if (refs.current.lastLocalUpdateAt > pullStartTime) {
        setStatus('ok')
        return
      }

      if (remote?.version) {
        const { state, status: migration } = migrateState(remote)
        if (migration === 'newer') {
          refs.current.remoteNewer = true
          setStatus('remote-newer')
          return
        }
        refs.current.remoteNewer = false
        if (migration !== 'invalid') importData(state)
      }
      setStatus('ok')
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
    if (refs.current.remoteNewer) return
    // Never write before reading. The push scheduled by hydration would
    // otherwise race the opening pull and clobber the remote with stale
    // on-disk state.
    if (!refs.current.hasPulled) return
    try {
      setStatus('syncing')
      const rev = await pushToFirebase(config, getSerializableState(), {
        baseRev: refs.current.baseRev,
      })
      if (rev !== null) refs.current.baseRev = rev
      setStatus('ok')
    } catch (err) {
      if (err?.message === REV_CONFLICT && !refs.current.retryingConflict) {
        // Another device wrote while this one was editing. Re-read to adopt the
        // new base revision, then push once more so the local edit is not
        // stranded waiting on a future store change. Guarded against recursing
        // if the remote keeps moving.
        refs.current.retryingConflict = true
        try {
          setStatus('conflict')
          await pull()
          await push()
        } finally {
          refs.current.retryingConflict = false
        }
        return
      }
      setStatus(KEY_ERRORS.has(err?.message) ? 'key-required' : 'error')
    }
  }, [hydrated, pull])

  const pushNow = useCallback(() => {
    clearTimeout(refs.current.pushTimeout)
    refs.current.pushTimeout = null
    void push()
  }, [push])

  const pullNow = useCallback(() => {
    void pull()
  }, [pull])

  const pullIfStale = useCallback(() => {
    void pull({ force: false })
  }, [pull])

  useEffect(() => {
    const tracked = refs.current
    const unsubscribe = useStore.subscribe(() => {
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
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [pushNow])

  useEffect(() => {
    window.addEventListener('focus', pullNow)
    return () => window.removeEventListener('focus', pullNow)
  }, [pullNow])

  useEffect(() => {
    const id = setInterval(pullNow, PULL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pullNow])

  useEffect(() => { pullNow() }, [pullNow])

  return { status, pullNow, pullIfStale }
}
