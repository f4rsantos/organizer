import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { isSharedLocalHidden } from '@/lib/collab/mergeUtils'

function mapRemoteNote(note, teamId, sharedNoteFolders) {
  const id = `shared:${teamId}:${note.id}`
  return {
    id,
    title: note.title ?? '',
    kind: 'text',
    body: '',
    doc: null,
    strokes: [],
    folderId: sharedNoteFolders[id] ?? null,
    favorite: false,
    archived: false,
    order: 0,
    createdAt: note.createdAt ?? 0,
    updatedAt: note.updatedAt ?? 0,
    sharedMeta: {
      teamId,
      sharedNoteId: note.id,
      remote: true,
    },
  }
}

export function useMergedNotes() {
  const localNotes = useStore(s => s.notes ?? [])
  const collabEnabled = useStore(s => s.settings?.collabEnabled === true)
  const memberships = useStore(s => s.collab?.memberships ?? [])
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const sharedNoteFolders = useStore(s => s.sharedNoteFolders ?? {})

  return useMemo(() => {
    const activeTeamIds = new Set((collabEnabled ? memberships : []).map(m => m.teamId))
    const local = localNotes.filter(note => !isSharedLocalHidden(note, activeTeamIds, runtimeTeams))

    const remote = (collabEnabled ? memberships : []).flatMap(membership => {
      const team = runtimeTeams[membership.teamId]
      return (team?.state?.notes ?? []).map(note => mapRemoteNote(note, membership.teamId, sharedNoteFolders))
    })

    return [...local, ...remote]
  }, [localNotes, collabEnabled, memberships, runtimeTeams, sharedNoteFolders])
}
