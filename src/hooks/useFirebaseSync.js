import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadFirebaseConfig, pushToFirebase, pullFromFirebase } from '@/lib/firebase'

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
  })
  const [status, setStatus] = useState('idle')

  const pull = useCallback(async () => {
    if (refs.current.isPulling) return
    const config = loadFirebaseConfig()
    if (!config) return
    refs.current.isPulling = true
    try {
      setStatus('syncing')
      const remote = await pullFromFirebase(config)
      if (remote?.version) importData(remote)
      setStatus('ok')
    } catch {
      setStatus('error')
    } finally {
      refs.current.isPulling = false
    }
  }, [importData])

  const push = useCallback(async () => {
    const config = loadFirebaseConfig()
    if (!config) return
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
