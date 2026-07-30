import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadStateAsync } from '@/store/persist'

export function useHydrateState() {
  const hydrateState = useStore(s => s.hydrateState)
  const markHydrated = useStore(s => s.markHydrated)
  const [ready, setReady] = useState(false)

  useEffect(() => {
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
  }, [hydrateState, markHydrated])

  return ready
}
