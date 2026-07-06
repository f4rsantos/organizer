import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { getOrCreateCollabUserId } from '@/lib/collab/identity'
import { deleteTeam, subscribeTeam } from '@/lib/collab/firebase'
import { isTeamExpired } from '@/lib/collab/schema'
import { markCollabRulesEnabled } from '@/lib/firebase'

export function useCollabSync() {
  const collab = useStore(s => s.collab)
  const enabled = useStore(s => s.settings?.collabEnabled === true)
  const memberships = collab?.memberships ?? []
  const setCollabUserId = useStore(s => s.setCollabUserId)
  const setCollabRuntimeTeam = useStore(s => s.setCollabRuntimeTeam)
  const clearCollabRuntimeTeam = useStore(s => s.clearCollabRuntimeTeam)
  const removeCollabMembership = useStore(s => s.removeCollabMembership)

  const userId = useMemo(() => collab?.userId ?? null, [collab?.userId])

  const membershipsKey = useMemo(
    () => memberships.map(m => `${m.teamId}:${m.projectId}:${m.apiKey}`).join('|'),
    [memberships],
  )

  useEffect(() => {
    if (!enabled) return
    markCollabRulesEnabled()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    if (userId) return
    const id = getOrCreateCollabUserId()
    setCollabUserId(id)
  }, [enabled, userId, setCollabUserId])

  useEffect(() => {
    if (!enabled) {
      memberships.forEach(membership => clearCollabRuntimeTeam(membership.teamId))
      return
    }

    const disposers = memberships.map(membership => {
      const config = { apiKey: membership.apiKey, projectId: membership.projectId }
      const teamId = membership.teamId

      const onData = async team => {
        if (team === null) {
          clearCollabRuntimeTeam(teamId)
          removeCollabMembership(teamId)
          return
        }
        if (isTeamExpired(team)) {
          clearCollabRuntimeTeam(teamId)
          if (team.hostUserId === userId) {
            try { await deleteTeam({ config, teamId }) } catch {}
          }
          removeCollabMembership(teamId)
          return
        }
        setCollabRuntimeTeam(teamId, { ...team, config, syncStatus: 'live', syncedAt: Date.now() })
      }

      const onError = () => {
        const prev = useStore.getState().collabRuntime?.teams?.[teamId]
        setCollabRuntimeTeam(teamId, { ...(prev ?? {}), config, syncStatus: 'error' })
      }

      return subscribeTeam({ config, teamId, onData, onError })
    })

    return () => {
      disposers.forEach(dispose => {
        if (typeof dispose === 'function') dispose()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, membershipsKey, userId, setCollabRuntimeTeam, clearCollabRuntimeTeam, removeCollabMembership])
}
