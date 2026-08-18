import { useCallback } from 'react'
import { useStore } from '@/store/useStore'

// Team documents identify a member by the per-project Firebase auth UID stored
// on the membership, not by the local `collab.userId`. Anything read out of a
// team payload -- `doneBy` keys, `assigneeUserId`, `sharedByUserId`,
// `hostUserId` -- has to be compared against the id for that specific team.
export function resolveTeamUserId(state, teamId) {
  if (!teamId) return state?.collab?.userId ?? null
  const membership = (state?.collab?.memberships ?? []).find(m => m.teamId === teamId)
  return membership?.memberUserId ?? state?.collab?.userId ?? null
}

export function useTeamUserId() {
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const userId = useStore(s => s.collab?.userId ?? null)

  return useCallback(teamId => {
    if (!teamId) return userId
    return memberships.find(m => m.teamId === teamId)?.memberUserId ?? userId
  }, [memberships, userId])
}

// Resolves the identity for whichever team an entity belongs to, falling back
// to the local id for purely local entities.
export function entityTeamId(entity) {
  return entity?.sharedMeta?.teamId ?? entity?.sharedRef?.teamId ?? null
}
