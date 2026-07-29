import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadStateAsync } from '@/store/persist'
import { isEncryptionEnabled } from '@/lib/crypto'

export function useHydrateState() {
  const hydrateState = useStore(s => s.hydrateState)
  const markHydrated = useStore(s => s.markHydrated)
  const [ready, setReady] = useState(() => !isEncryptionEnabled())

  useEffect(() => {
    if (ready) {
      markHydrated()
      return
    }

    let cancelled = false
    loadStateAsync()
      .then(state => {
        if (cancelled) return
        if (state) hydrateState(state)
        else markHydrated()
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => { cancelled = true }
  }, [ready, hydrateState, markHydrated])

  return ready
}
