export const JOURNAL_RING_CAPACITY = 10

function flattenGradeComponents(store) {
  const components = []
  for (const semGrades of Object.values(store?.grades ?? {})) {
    for (const classGrades of Object.values(semGrades ?? {})) {
      for (const component of classGrades?.components ?? []) {
        components.push(component)
      }
    }
  }
  return components
}

function findEntity(store, entityType, id) {
  if (entityType === 'gradeComponent') {
    return flattenGradeComponents(store).find(item => item?.id === id) ?? null
  }
  const source = {
    task: store?.tasks,
    event: store?.events,
    note: store?.notes,
    folder: store?.noteFolders,
    habit: store?.habits,
    class: store?.classes,
    kanbanCard: store?.tasks,
  }[entityType]
  return (source ?? []).find(item => item?.id === id) ?? null
}

function fieldsMatch(entity, expectedFields) {
  if (!entity) return false
  return Object.entries(expectedFields ?? {}).every(([key, value]) => entity[key] === value)
}

export function isInverseOpApplicable(op, store) {
  if (!op) return false
  if (op.type === 'create') return !findEntity(store, op.entityType, op.entity?.id ?? op.id)
  if (op.type === 'delete') return Boolean(findEntity(store, op.entityType, op.targetId))
  if (op.type === 'update') {
    const entity = findEntity(store, op.entityType, op.targetId)
    if (!entity) return false
    return fieldsMatch(entity, op.patch)
  }
  return false
}

export function isRunUndoable(run, store) {
  if (!run) return false
  if (!run.inverse?.length) return false
  return run.inverse.every(op => isInverseOpApplicable(op, store))
}

export function buildJournalEntry({ run, requestCount = 0, changeSummary = {} }) {
  return {
    runId: run.id,
    ranAt: Date.now(),
    slot: run.slot ?? null,
    model: run.model ?? null,
    scope: run.scope ?? null,
    requestCount,
    changeSummary,
    inverse: run.inverse ?? [],
    undoable: true,
  }
}

export function pushJournalEntry(journal, entry) {
  const entries = journal?.entries ?? []
  const next = [entry, ...entries]
  return {
    ...journal,
    entries: next.slice(0, JOURNAL_RING_CAPACITY),
  }
}

export function markEntryUndoable(journal, runId, undoable) {
  const entries = journal?.entries ?? []
  return {
    ...journal,
    entries: entries.map(entry => (entry.runId === runId ? { ...entry, undoable } : entry)),
  }
}

export function removeJournalEntry(journal, runId) {
  const entries = journal?.entries ?? []
  return {
    ...journal,
    entries: entries.filter(entry => entry.runId !== runId),
  }
}

export function nextUndoableEntry(journal) {
  const entries = journal?.entries ?? []
  return entries.find(entry => entry.undoable) ?? null
}

export function isLifoUndoTarget(journal, runId) {
  const target = nextUndoableEntry(journal)
  return Boolean(target) && target.runId === runId
}

export function emptyJournal() {
  return { entries: [] }
}
