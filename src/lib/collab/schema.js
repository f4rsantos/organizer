export const DEFAULT_TEAM_COLUMNS = [
  { id: 'col_todo', title: 'To Do', order: 0 },
  { id: 'col_inprogress', title: 'In Progress', order: 1 },
  { id: 'col_done', title: 'Done', order: 2 },
]

export function createTeamState() {
  return {
    tasks: [],
    kanban: {
      columns: DEFAULT_TEAM_COLUMNS,
      cards: [],
    },
  }
}

export function isTeamExpired(team) {
  if (!Number.isFinite(team?.expiresAt)) return false
  return Date.now() > team.expiresAt
}

export function isMember(team, userId) {
  return Boolean(team?.members?.[userId])
}

// Teams created before members were keyed by the Firebase auth UID cannot be
// repaired in place: the rules only accept writes from an id already present in
// `members`, and every user runs their own Firebase project, so there is no
// central migration. Such a team is detectable and has to be recreated.
export function isLegacyIdentityTeam(team, memberUserId) {
  if (!team || team.locked) return false
  const members = team.members
  if (!members || typeof members !== 'object') return false
  if (Object.keys(members).length === 0) return false
  if (!memberUserId) return false
  return !members[memberUserId]
}
