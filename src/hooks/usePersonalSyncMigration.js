import { useCallback, useEffect, useState } from 'react'
import { loadFirebaseConfig, migratePersonalSyncDoc } from '@/lib/firebase'

const BLOCKED_SYNC_STATUSES = ['rules-outdated', 'config-outdated']

export function usePersonalSyncMigration({ syncStatus, onResolved }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!dismissed && BLOCKED_SYNC_STATUSES.includes(syncStatus)) setOpen(true)
  }, [syncStatus, dismissed])

  const confirm = useCallback(async () => {
    const config = loadFirebaseConfig()
    if (!config) {
      setOpen(false)
      return
    }
    setChecking(true)
    setError(null)
    try {
      await migratePersonalSyncDoc(config)
      setOpen(false)
      onResolved?.()
    } catch (err) {
      setError(err)
    } finally {
      setChecking(false)
    }
  }, [onResolved])

  const dismiss = useCallback(() => {
    setDismissed(true)
    setOpen(false)
  }, [])

  return { open, checking, error, confirm, dismiss }
}
