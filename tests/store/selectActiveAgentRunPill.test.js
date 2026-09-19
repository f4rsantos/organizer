import { describe, it, expect } from 'vitest'
import { selectActiveAgentRunPill } from '../../src/store/selectors'
import { createAgentRun, withRunStatus, appendOpsToRun, makeCreateOp } from '@/lib/ai/agentOverlay'

function stateWithRun(run) {
  return { agentRuntime: { runs: { [run.id]: run }, activeRunId: run.id } }
}

describe('selectActiveAgentRunPill', () => {
  it('returns null when there is no active run', () => {
    expect(selectActiveAgentRunPill({ agentRuntime: { runs: {}, activeRunId: null } })).toBeNull()
  })

  it('returns null when the active run id has no matching run', () => {
    expect(selectActiveAgentRunPill({ agentRuntime: { runs: {}, activeRunId: 'missing' } })).toBeNull()
  })

  it('returns null when agentRuntime is absent entirely', () => {
    expect(selectActiveAgentRunPill({})).toBeNull()
  })

  it('reports working for a planning run', () => {
    const run = createAgentRun({ runId: 'r1' })
    const pill = selectActiveAgentRunPill(stateWithRun(run))
    expect(pill).toEqual({ runId: 'r1', phase: 'working', opCount: 0 })
  })

  it('reports working for an applying run and counts ops', () => {
    const op = makeCreateOp({ entityType: 'task', id: 't1', entity: {} })
    const run = appendOpsToRun(withRunStatus(createAgentRun({ runId: 'r1' }), 'applying'), [op])
    const pill = selectActiveAgentRunPill(stateWithRun(run))
    expect(pill).toEqual({ runId: 'r1', phase: 'working', opCount: 1 })
  })

  it('reports awaitingConfirm', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'awaitingConfirm')
    const pill = selectActiveAgentRunPill(stateWithRun(run))
    expect(pill).toEqual({ runId: 'r1', phase: 'awaitingConfirm', opCount: 0 })
  })

  it('reports failed', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'failed')
    const pill = selectActiveAgentRunPill(stateWithRun(run))
    expect(pill).toEqual({ runId: 'r1', phase: 'failed', opCount: 0 })
  })

  it('reports interrupted', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'interrupted')
    const pill = selectActiveAgentRunPill(stateWithRun(run))
    expect(pill).toEqual({ runId: 'r1', phase: 'interrupted', opCount: 0 })
  })

  it('reports done for a committed run still referenced as active', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'committed')
    const pill = selectActiveAgentRunPill(stateWithRun(run))
    expect(pill).toEqual({ runId: 'r1', phase: 'done', opCount: 0 })
  })

  it('returns null for a discarded run', () => {
    const run = withRunStatus(createAgentRun({ runId: 'r1' }), 'discarded')
    expect(selectActiveAgentRunPill(stateWithRun(run))).toBeNull()
  })
})
