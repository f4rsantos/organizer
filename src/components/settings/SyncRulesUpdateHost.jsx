import { usePersonalSyncMigration } from '@/hooks/usePersonalSyncMigration'
import { SyncRulesUpdateModal } from '@/components/settings/SyncRulesUpdateModal'

export function SyncRulesUpdateHost({ syncStatus, onResolved }) {
  const { open, checking, error, confirm, dismiss } = usePersonalSyncMigration({ syncStatus, onResolved })
  if (!open) return null
  return <SyncRulesUpdateModal checking={checking} error={error} onConfirm={confirm} onDismiss={dismiss} />
}
