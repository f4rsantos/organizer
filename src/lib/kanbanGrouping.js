export function cardTeamId(card) {
  return card.sharedMeta?.teamId ?? card.sharedRef?.teamId ?? null
}

function cardClassKey(card) {
  return card.className ?? card.classId ?? '__none__'
}

function buildTeamGroups(cards, runtimeTeams, personalLabel) {
  const order = []
  const local = cards.filter(c => !cardTeamId(c))
  if (local.length) order.push({ key: 'local', label: personalLabel, teamId: null })
  const seenTeams = new Set()
  for (const card of cards) {
    const tid = cardTeamId(card)
    if (!tid || seenTeams.has(tid)) continue
    seenTeams.add(tid)
    order.push({ key: `team-${tid}`, label: runtimeTeams[tid]?.name ?? 'Shared', teamId: tid })
  }
  return order
}

function buildClassGroups(cards) {
  const order = []
  const seen = new Set()
  for (const card of cards) {
    const cls = cardClassKey(card)
    if (seen.has(cls)) continue
    seen.add(cls)
    order.push({ key: `class-${cls}`, label: cls === '__none__' ? null : cls, classKey: cls })
  }
  return order
}

/**
 * Returns an ordered list of group descriptors derived from the full card set,
 * independent of any single column, so bands line up across columns.
 */
export function computeCardGroups(allCards, separateByTeam, separateByClass, runtimeTeams, personalLabel) {
  if (!separateByTeam && !separateByClass) return [{ key: 'all', label: null }]

  if (separateByTeam && !separateByClass) {
    const groups = buildTeamGroups(allCards, runtimeTeams, personalLabel)
    return groups.length <= 1 ? [{ key: 'all', label: null }] : groups
  }

  if (!separateByTeam && separateByClass) {
    const groups = buildClassGroups(allCards)
    return groups.length <= 1 ? [{ key: 'all', label: null }] : groups
  }

  const teamGroups = buildTeamGroups(allCards, runtimeTeams, personalLabel)
  const groups = []
  for (const teamGroup of teamGroups) {
    const teamCards = allCards.filter(c => (teamGroup.teamId === null ? !cardTeamId(c) : cardTeamId(c) === teamGroup.teamId))
    const classGroups = buildClassGroups(teamCards)
    if (classGroups.length <= 1) {
      groups.push({ key: teamGroup.key, label: teamGroup.label, teamId: teamGroup.teamId, classKey: null })
    } else {
      let first = true
      for (const classGroup of classGroups) {
        const parts = [teamGroup.label, classGroup.label].filter(Boolean).join(' · ')
        groups.push({
          key: `${teamGroup.key}-${classGroup.classKey}`,
          label: first ? (parts || null) : classGroup.label,
          teamId: teamGroup.teamId,
          classKey: classGroup.classKey,
        })
        first = false
      }
    }
  }
  return groups.length <= 1 ? [{ key: 'all', label: null }] : groups
}

/** Filters cards belonging to a single group descriptor produced by computeCardGroups. */
export function cardsInGroup(cards, group) {
  if (group.key === 'all') return cards
  return cards.filter(card => {
    if ('teamId' in group) {
      const tid = cardTeamId(card)
      if (group.teamId === null ? !!tid : tid !== group.teamId) return false
    }
    if ('classKey' in group && group.classKey !== null && group.classKey !== undefined) {
      if (cardClassKey(card) !== group.classKey) return false
    }
    return true
  })
}
