import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { getMemberColor, getMemberDisplayName } from '@/lib/collab/teamColors'
import { resolveTeamUserId } from '@/hooks/useTeamIdentity'

function buildCursorElement(user) {
  const wrapper = document.createElement('span')
  wrapper.classList.add('yjs-remote-cursor')
  wrapper.setAttribute('style', `border-left: 2px solid ${user?.color ?? '#6366f1'}; margin-left: -1px; position: relative;`)
  const label = document.createElement('span')
  label.textContent = user?.name ?? ''
  label.setAttribute('style', [
    'position: absolute',
    'top: -1.35em',
    'left: -2px',
    'padding: 0 4px',
    'border-radius: 4px',
    'font-size: 10px',
    'line-height: 1.4',
    'white-space: nowrap',
    'user-select: none',
    'color: #fff',
    `background-color: ${user?.color ?? '#6366f1'}`,
  ].join(';'))
  wrapper.appendChild(label)
  return wrapper
}

export function useSharedNoteSession(sharedMeta) {
  const teamId = sharedMeta?.teamId ?? null
  const sharedNoteId = sharedMeta?.sharedNoteId ?? null
  const lang = useStore(s => s.lang ?? 'en')
  const collabUserId = useStore(s => s.collab?.userId ?? null)
  const membership = useStore(s => (s.collab?.memberships ?? []).find(m => m.teamId === teamId) ?? null)
  const team = useStore(s => (teamId ? s.collabRuntime?.teams?.[teamId] : null) ?? null)
  const setCollabRuntimeTeam = useStore(s => s.setCollabRuntimeTeam)
  const setCollabError = useStore(s => s.setCollabError)
  const [collab, setCollab] = useState(null)
  const sessionRef = useRef(null)

  const teamRef = useRef(team)
  teamRef.current = team
  const membershipRef = useRef(membership)
  membershipRef.current = membership
  const strings = useRef(null)
  strings.current = useStrings(lang)

  const storedState = (team?.state?.notes ?? []).find(note => note?.id === sharedNoteId)?.ydocState ?? null
  const presenceMap = team?.notePresence ?? null
  const presenceMapRef = useRef(presenceMap)
  presenceMapRef.current = presenceMap

  useEffect(() => {
    if (!teamId || !sharedNoteId || !membershipRef.current) return
    let cancelled = false
    let heartbeat = null
    let active = null

    const start = async () => {
      const [
        { createNoteDocSession, createNoteAwareness, noteCollabExtensionPlugins, encodeAwarenessPresence, presenceEntryKey, presenceKeysToEvict, AWARENESS_HEARTBEAT_MS },
        { publishNotePresence, clearNotePresence, updateTeamState },
        { classifyCollabError },
      ] = await Promise.all([
        import('@/lib/collab/noteDoc'),
        import('@/lib/collab/firebase'),
        import('@/lib/collab/errors'),
      ])
      if (cancelled) return

      const currentMembership = membershipRef.current
      const config = { apiKey: currentMembership.apiKey, projectId: currentMembership.projectId }
      const me = resolveTeamUserId(collabUserId, teamId)
      const members = teamRef.current?.members ?? {}
      const localUser = {
        name: members[me]?.alias || getMemberDisplayName({ userId: me }, null, strings.current),
        color: getMemberColor(members, me),
      }

      const initialStored = (teamRef.current?.state?.notes ?? [])
        .find(note => note?.id === sharedNoteId)?.ydocState ?? ''

      const writeSharedNote = async encoded => {
        const applyUpdate = state => ({
          ...state,
          notes: (state?.notes ?? []).map(note => (
            note?.id === sharedNoteId
              ? { ...note, ydocState: encoded, updatedAt: Date.now(), updatedBy: me }
              : note
          )),
        })
        const runtime = useStore.getState().collabRuntime?.teams?.[teamId]
        if (runtime) {
          setCollabRuntimeTeam(teamId, { ...runtime, state: applyUpdate(runtime.state ?? {}) })
        }
        try {
          await updateTeamState({
            config, teamId, teamKey: currentMembership.teamKey, updater: applyUpdate,
          })
        } catch (err) {
          setCollabError(teamId, err?.message ?? 'Sync failed', classifyCollabError(err))
        }
      }

      const session = createNoteDocSession({ stored: initialStored, onFlush: writeSharedNote })
      const awareness = createNoteAwareness(session.ydoc, localUser)
      active = { session, awareness }
      sessionRef.current = active

      const beat = () => {
        const presence = encodeAwarenessPresence(awareness)
        if (!presence) return
        const staleKeys = presenceKeysToEvict(presenceMapRef.current, {
          protectedKey: presenceEntryKey(sharedNoteId, presence.clientId),
        })
        publishNotePresence({
          config, teamId, teamKey: currentMembership.teamKey, sharedNoteId, presence, staleKeys,
        }).catch(() => {})
      }
      beat()
      heartbeat = setInterval(beat, AWARENESS_HEARTBEAT_MS)

      active.stopPresence = async () => {
        if (heartbeat) clearInterval(heartbeat)
        heartbeat = null
        await clearNotePresence({ config, teamId, sharedNoteId, clientId: awareness.clientID }).catch(() => {})
      }

      setCollab({
        plugins: noteCollabExtensionPlugins({
          ydoc: session.ydoc,
          awareness,
          cursorBuilder: buildCursorElement,
        }),
      })
    }

    start().catch(() => {})

    return () => {
      cancelled = true
      setCollab(null)
      const pending = active ?? sessionRef.current
      sessionRef.current = null
      if (!pending) return
      pending.stopPresence?.()
      pending.awareness?.destroy?.()
      pending.session.destroy().catch(() => {})
    }
  }, [teamId, sharedNoteId, collabUserId, setCollabRuntimeTeam, setCollabError])

  useEffect(() => {
    if (!storedState) return
    sessionRef.current?.session?.receiveRemote(storedState)
  }, [storedState])

  useEffect(() => {
    const awareness = sessionRef.current?.awareness
    if (!awareness || !sharedNoteId) return
    let cancelled = false
    const teamKey = membershipRef.current?.teamKey ?? null
    import('@/lib/collab/noteDoc').then(async ({ openPresenceEntriesForNote, applyAwarenessPresence }) => {
      const entries = await openPresenceEntriesForNote({ presenceMap, sharedNoteId, teamId, teamKey })
      if (cancelled) return
      applyAwarenessPresence(awareness, entries)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [presenceMap, sharedNoteId, teamId, collab])

  return collab
}
