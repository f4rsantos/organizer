import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { getOrCreateCollabUserId } from '@/lib/collab/identity'
import { deleteTeam, fetchTeam } from '@/lib/collab/firebase'
import { isTeamExpired } from '@/lib/collab/schema'
import { markCollabRulesEnabled } from '@/lib/firebase'

const COLLAB_SYNC_INTERVAL_MS = 5 * 60 * 1000

export function useCollabSync() {
  const collab = useStore(s => s.collab)
  const enabled = useStore(s => s.settings?.collabEnabled === true)
  const memberships = collab?.memberships ?? []
  const setCollabUserId = useStore(s => s.setCollabUserId)
  const setCollabRuntimeTeam = useStore(s => s.setCollabRuntimeTeam)
  const clearCollabRuntimeTeam = useStore(s => s.clearCollabRuntimeTeam)
  const removeCollabMembership = useStore(s => s.removeCollabMembership)

  const userId = useMemo(() => collab?.userId ?? null, [collab?.userId])

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
      let cancelled = false
      const config = { apiKey: membership.apiKey, projectId: membership.projectId }

      const syncTeam = async () => {
        try {
          const team = await fetchTeam({ config, teamId: membership.teamId })
          if (cancelled) return

          if (!team) {
            clearCollabRuntimeTeam(membership.teamId)
            removeCollabMembership(membership.teamId)
            return
          }

          if (isTeamExpired(team)) {
            clearCollabRuntimeTeam(membership.teamId)
            if (team.hostUserId === userId) {
              try {
                await deleteTeam({ config, teamId: membership.teamId })
              } catch {
              }
            }
            removeCollabMembership(membership.teamId)
            return
          }

          setCollabRuntimeTeam(membership.teamId, {
            ...team,
            config,
          })
        } catch {
          if (!cancelled) clearCollabRuntimeTeam(membership.teamId)
        }
      }

      syncTeam()
      const intervalId = setInterval(syncTeam, COLLAB_SYNC_INTERVAL_MS)

      return () => {
        cancelled = true
        clearInterval(intervalId)
      }
    })

    return () => {
      disposers.forEach(dispose => {
        if (typeof dispose === 'function') dispose()
      })
    }
  }, [enabled, memberships, userId, setCollabRuntimeTeam, clearCollabRuntimeTeam, removeCollabMembership])
}
