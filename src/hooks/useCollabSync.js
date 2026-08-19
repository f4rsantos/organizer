import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { getOrCreateCollabUserId, readCachedCollabUserId, cacheCollabUserId } from '@/lib/collab/identity'
import { deleteTeam, subscribeTeam, resolveDeviceAuthUid, attachDeviceWithKey } from '@/lib/collab/firebase'
import { isTeamExpired, isKnownDevice } from '@/lib/collab/schema'
import { markCollabRulesEnabled } from '@/lib/firebase'

export function useCollabSync() {
  const collab = useStore(s => s.collab)
  const hydrated = useStore(s => s.hydrated === true)
  const enabled = useStore(s => s.settings?.collabEnabled === true) && hydrated
  const memberships = collab?.memberships ?? []
  const setCollabUserId = useStore(s => s.setCollabUserId)
  const setCollabRuntimeTeam = useStore(s => s.setCollabRuntimeTeam)
  const clearCollabRuntimeTeam = useStore(s => s.clearCollabRuntimeTeam)
  const removeCollabMembership = useStore(s => s.removeCollabMembership)
  const updateCollabMembership = useStore(s => s.updateCollabMembership)

  const userId = useMemo(() => collab?.userId ?? null, [collab?.userId])

  const membershipsKey = useMemo(
    () => memberships.map(m => `${m.teamId}:${m.projectId}:${m.apiKey}:${m.teamKey ?? ''}`).join('|'),
    [memberships],
  )

  useEffect(() => {
    if (!enabled) return
    markCollabRulesEnabled()
  }, [enabled])

  // Minting only happens once the synced slice has had its chance to land: an
  // id created ahead of the first pull would be a second member of every team,
  // with its own alias, its own doneBy entries and no host rights.
  useEffect(() => {
    if (!enabled) return
    if (userId) return
    const id = readCachedCollabUserId() ?? getOrCreateCollabUserId()
    cacheCollabUserId(id)
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
          return
        }
        if (isTeamExpired(team)) {
          clearCollabRuntimeTeam(teamId)
          if (team.hostPersonId && team.hostPersonId === userId) {
            try { await deleteTeam({ config, teamId }) } catch {
              // local membership is removed below regardless
            }
          }
          removeCollabMembership(teamId)
          return
        }
        if (typeof team.name === 'string' && team.name) {
          const stored = useStore.getState().collab?.memberships
            ?.find(m => m.teamId === teamId)?.teamName
          if (stored !== team.name) updateCollabMembership(teamId, { teamName: team.name })
        }
        if (team.locked) {
          setCollabRuntimeTeam(teamId, { ...team, config, syncStatus: 'key-required' })
          return
        }
        const authUid = await resolveDeviceAuthUid(config).catch(() => null)
        if (!isKnownDevice(team, authUid)) {
          const personId = useStore.getState().collab?.userId ?? null
          const { attached } = await attachDeviceWithKey({
            config, teamId, teamKey: membership.teamKey, personId,
          }).catch(() => ({ attached: false }))
          if (!attached) {
            setCollabRuntimeTeam(teamId, { ...team, config, syncStatus: 'device-unlinked' })
            return
          }
        }
        setCollabRuntimeTeam(teamId, { ...team, config, syncStatus: 'live', syncedAt: Date.now() })
      }

      const onError = () => {
        const prev = useStore.getState().collabRuntime?.teams?.[teamId]
        setCollabRuntimeTeam(teamId, { ...(prev ?? {}), config, syncStatus: 'error' })
      }

      return subscribeTeam({ config, teamId, teamKey: membership.teamKey, onData, onError })
    })

    return () => {
      disposers.forEach(dispose => {
        if (typeof dispose === 'function') dispose()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, membershipsKey, userId, setCollabRuntimeTeam, clearCollabRuntimeTeam, removeCollabMembership, updateCollabMembership])
}
