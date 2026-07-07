export function isSharedLocalHidden(entity, activeTeamIds, runtimeTeams) {
  const teamId = entity?.sharedRef?.teamId
  if (!teamId || !activeTeamIds.has(teamId)) return false
  const team = runtimeTeams[teamId]
  if (!team || team.syncStatus === 'error') return false
  const { sharedTaskId, sharedCardId } = entity.sharedRef
  if (sharedTaskId) return (team.state?.tasks ?? []).some(t => t?.id === sharedTaskId)
  if (sharedCardId) return (team.state?.kanban?.cards ?? []).some(c => c?.id === sharedCardId)
  return false
}
