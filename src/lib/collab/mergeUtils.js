export function isSharedLocalHidden(entity, activeTeamIds, runtimeTeams) {
  const teamId = entity?.sharedRef?.teamId
  if (!teamId || !activeTeamIds.has(teamId)) return false
  const team = runtimeTeams[teamId]
  if (!team || team.syncStatus === 'error') return false
  const { sharedTaskId, sharedCardId, sharedEventId } = entity.sharedRef
  if (sharedTaskId) return (team.state?.tasks ?? []).some(t => t?.id === sharedTaskId)
  if (sharedCardId) return (team.state?.kanban?.cards ?? []).some(c => c?.id === sharedCardId)
  if (sharedEventId) return (team.state?.events ?? []).some(e => e?.id === sharedEventId)
  return false
}

const AGENT_ID_PREFIX = 'agent:'

export function buildAgentEntityId(runId, localId) {
  return `${AGENT_ID_PREFIX}${runId}:${localId}`
}

export function parseAgentEntityId(id) {
  if (typeof id !== 'string' || !id.startsWith(AGENT_ID_PREFIX)) return null
  const rest = id.slice(AGENT_ID_PREFIX.length)
  const separatorIndex = rest.indexOf(':')
  if (separatorIndex === -1) return null
  return {
    runId: rest.slice(0, separatorIndex),
    localId: rest.slice(separatorIndex + 1),
  }
}

function opsForEntityType(run, entityType) {
  return (run?.ops ?? []).filter(op => op?.entityType === entityType)
}

export function applyAgentOverlay(entities, run, entityType) {
  const ops = opsForEntityType(run, entityType)
  if (!ops.length) return entities

  const runId = run?.id ?? run?.runId ?? null
  const creates = ops.filter(op => op?.type === 'create')
  const updatesById = new Map(
    ops.filter(op => op?.type === 'update' && op?.targetId != null).map(op => [op.targetId, op]),
  )
  const deletesById = new Map(
    ops.filter(op => op?.type === 'delete' && op?.targetId != null).map(op => [op.targetId, op]),
  )

  const transformed = entities.map(entity => {
    const updateOp = updatesById.get(entity?.id)
    if (updateOp) {
      return {
        ...entity,
        ...updateOp.patch,
        id: entity.id,
        agentMeta: { runId, op: 'update', baseId: entity.id },
      }
    }

    const deleteOp = deletesById.get(entity?.id)
    if (deleteOp) {
      return {
        ...entity,
        agentMeta: { runId, op: 'delete', baseId: entity.id },
      }
    }

    return entity
  })

  const created = creates.map(op => ({
    ...op.entity,
    id: buildAgentEntityId(runId, op.id ?? op.entity?.id),
    agentMeta: { runId, op: 'create', baseId: null },
  }))

  return [...transformed, ...created]
}
