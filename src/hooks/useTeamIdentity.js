import { useCallback } from 'react'
import { useStore } from '@/store/useStore'

export function resolveTeamUserId(collabUserId, teamId) {
  if (!teamId) return null
  return collabUserId ?? null
}

export function useTeamUserId() {
  const collabUserId = useStore(s => s.collab?.userId ?? null)
  return useCallback(teamId => resolveTeamUserId(collabUserId, teamId), [collabUserId])
}

export function entityTeamId(entity) {
  return entity?.sharedMeta?.teamId ?? entity?.sharedRef?.teamId ?? null
}
