const TEAM_PALETTE = [
  '#6366f1',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#8b5cf6',
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#06b6d4',
  '#f43f5e',
  '#a855f7',
]

export function getMemberColor(members, userId) {
  const sorted = Object.entries(members ?? {})
    .map(([id, data]) => ({ id, joinedAt: data?.joinedAt ?? 0 }))
    .sort((a, b) => a.joinedAt - b.joinedAt)
  const index = sorted.findIndex(m => m.id === userId)
  if (index < 0) return TEAM_PALETTE[0]
  return TEAM_PALETTE[index % TEAM_PALETTE.length]
}

export function getMemberList(team) {
  const members = team?.members ?? {}
  return Object.entries(members)
    .map(([id, data]) => ({
      userId: id,
      alias: data?.alias ?? '',
      joinedAt: data?.joinedAt ?? 0,
      role: data?.role ?? 'member',
    }))
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map(member => ({
      ...member,
      color: getMemberColor(members, member.userId),
    }))
}

export function getMemberDisplayName(member, currentUserId, t = {}) {
  if (!member) return ''
  if (member.userId === currentUserId) {
    return member.alias || t.collabYou || 'You'
  }
  return member.alias || t.collabRoleMember || 'Member'
}
