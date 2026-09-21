import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { isSharedLocalHidden, applyAgentOverlay } from '@/lib/collab/mergeUtils'

function mapRemoteEvent(event, teamId) {
  return {
    ...event,
    id: `shared:${teamId}:${event.id}`,
    semesterId: null,
    sharedMeta: {
      teamId,
      sharedEventId: event.id,
      remote: true,
    },
  }
}

export function useMergedEvents() {
  const localEvents = useStore(s => s.events ?? [])
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const activeRun = useStore(s => s.agentRuntime?.runs?.[s.agentRuntime?.activeRunId] ?? null)

  return useMemo(() => {
    const activeTeamIds = new Set((collabEnabled ? memberships : []).map(m => m.teamId))
    const local = localEvents.filter(event => !isSharedLocalHidden(event, activeTeamIds, runtimeTeams))

    const remote = (collabEnabled ? memberships : []).flatMap(membership => {
      const team = runtimeTeams[membership.teamId]
      return (team?.state?.events ?? []).map(event => mapRemoteEvent(event, membership.teamId))
    })

    return applyAgentOverlay([...local, ...remote], activeRun, 'event')
  }, [localEvents, collabEnabled, memberships, runtimeTeams, activeRun])
}
