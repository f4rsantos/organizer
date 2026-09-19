import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { loadStateAsync } from '@/store/persist'
import { loadFirebaseConfig, pullFromFirebase } from '@/lib/firebase'
import { migrateState } from '@/store/migrations'
import { setInitialSyncRev } from '@/hooks/useFirebaseSync'

const FIREBASE_LOAD_TIMEOUT_MS = 2500

export function useHydrateState() {
  const hydrateState = useStore(s => s.hydrateState)
  const markHydrated = useStore(s => s.markHydrated)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      let localState = null
      try {
        localState = await loadStateAsync()
      } catch {}

      if (cancelled) return

      if (localState) hydrateState(localState)
      else markHydrated()

      const config = loadFirebaseConfig()
      if (config) {
        try {
          const applyPulled = pulled => {
            if (cancelled || !pulled) return
            setInitialSyncRev(pulled.rev ?? 0)
            if (!pulled.state?.version) return
            const { state: remoteState, status } = migrateState(pulled.state)
            if (status !== 'invalid' && status !== 'newer') {
              useStore.getState().importData(remoteState)
            }
          }

          const request = pullFromFirebase(config).then(pulled => {
            applyPulled(pulled)
            return pulled
          })
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), FIREBASE_LOAD_TIMEOUT_MS))
          await Promise.race([request.catch(() => null), timeoutPromise])
        } catch {}
      }

      if (!cancelled) setReady(true)
    }

    void init()
    return () => { cancelled = true }
  }, [hydrateState, markHydrated])

  return ready
}
