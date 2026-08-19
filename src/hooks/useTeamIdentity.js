import { useCallback } from 'react'
import { useStore } from '@/store/useStore'

// Team docs key members by the per-project Firebase auth UID on the membership,
// never by the local `collab.userId`. No fallback to the latter on purpose: an
// unresolved membership returns null so comparisons fail closed instead of
// matching the wrong person. `useCollabSync` fills the id in on first read.
export function resolveTeamUserId(memberships, teamId) {
  if (!teamId) return null
  return (memberships ?? []).find(m => m.teamId === teamId)?.memberUserId ?? null
}

export function useTeamUserId() {
  const memberships = useStore(s => s.collab?.memberships ?? [])
  return useCallback(teamId => resolveTeamUserId(memberships, teamId), [memberships])
}

export function entityTeamId(entity) {
  return entity?.sharedMeta?.teamId ?? entity?.sharedRef?.teamId ?? null
}
