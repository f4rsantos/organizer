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
