export function shouldPromptAliasForMembership(membership, promptedTeamIds) {
  if (!membership?.teamId) return false
  const prompted = Array.isArray(promptedTeamIds) ? promptedTeamIds : []
  return !prompted.includes(membership.teamId)
}

export function nextAliasPromptTeamId(memberships, promptedTeamIds) {
  const list = Array.isArray(memberships) ? memberships : []
  const target = list.find(m => shouldPromptAliasForMembership(m, promptedTeamIds))
  return target?.teamId ?? null
}
