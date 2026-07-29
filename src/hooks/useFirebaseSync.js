import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadFirebaseConfig, pushToFirebase, pullFromFirebase } from '@/lib/firebase'
import { migrateState } from '@/store/migrations'

const PULL_INTERVAL_MS = 5 * 60 * 1000

function getSerializableState() {
  const s = useStore.getState()
  return JSON.parse(JSON.stringify(s))
}

export function useFirebaseSync() {
  const importData = useStore(s => s.importData)
  const refs = useRef({
    pushTimeout: null,
    isPulling: false,
    remoteNewer: false,
    lastLocalUpdateAt: 0,
  })
  const [status, setStatus] = useState('idle')

  const pull = useCallback(async () => {
    if (refs.current.isPulling) return
    const config = loadFirebaseConfig()
    if (!config) return
    refs.current.isPulling = true
    const pullStartTime = Date.now()
    try {
      setStatus('syncing')
      const remote = await pullFromFirebase(config)
      
      if (refs.current.lastLocalUpdateAt > pullStartTime) {
        // Local state was modified while we were waiting for remote!
        // Drop the pulled state to prevent overwriting local changes.
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
      setStatus(err?.message === 'encryption-key-required' ? 'key-required' : 'error')
    } finally {
      refs.current.isPulling = false
    }
  }, [importData])

  const push = useCallback(async () => {
    const config = loadFirebaseConfig()
    if (!config) return
    if (refs.current.remoteNewer) return
    try {
      setStatus('syncing')
      await pushToFirebase(config, getSerializableState())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }, [])

  const pullNow = useCallback(() => {
    void pull()
  }, [pull])

  useEffect(() => {
    return useStore.subscribe(() => {
      refs.current.lastLocalUpdateAt = Date.now()
      clearTimeout(refs.current.pushTimeout)
      refs.current.pushTimeout = setTimeout(push, 1000)
    })
  }, [push])

  useEffect(() => {
    window.addEventListener('focus', pullNow)
    return () => window.removeEventListener('focus', pullNow)
  }, [pullNow])

  useEffect(() => {
    const id = setInterval(pullNow, PULL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pullNow])

  useEffect(() => { pullNow() }, [pullNow])

  return { status, pullNow }
}
