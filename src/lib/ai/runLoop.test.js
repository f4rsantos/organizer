import { describe, it, expect, vi } from 'vitest'
import { runAgentLoop, BULK_OP_THRESHOLD } from './runLoop'

const MEDIUM_SLOT = { provider: 'anthropic', model: 'claude-medium' }
const HIGH_SLOT = { provider: 'anthropic', model: 'claude-high' }
const SLOTS = { medium: MEDIUM_SLOT, high: HIGH_SLOT }

const CREDENTIALS = { apiKey: 'key', baseUrl: '' }

function resolveCredentials() {
  return CREDENTIALS
}

function fixedClock(startedAt = 0, elapsed = 100) {
  let calls = 0
  return {
    now: () => {
      calls += 1
      return calls === 1 ? startedAt : startedAt + elapsed
    },
  }
}

function store() {
  return {
    tasks: [{ id: 't1', title: 'Essay draft', dueDate: '2026-09-08', done: false, views: {} }],
    events: [],
    notes: [],
    noteFolders: [],
    habits: [],
    classes: [],
  }
}

function okResult({ toolCalls = [], usage = { inputTokens: 10, outputTokens: 10 } } = {}) {
  return { ok: true, toolCalls, usage, finishReason: 'stop', text: '' }
}

function createBatchCall(items) {
  return { name: 'create', args: { type: 'task', items } }
}

function doneCall() {
  return { name: 'done', args: { summary: 'done' } }
}

describe('runAgentLoop batching', () => {
  it('produces exactly one request when the model batches every op in one turn', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [
        createBatchCall([{ type: 'task', fields: { id: 'n1', title: 'New task' } }]),
        doneCall(),
      ],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'add a task',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(result.requestCount).toBe(1)
    expect(result.run.entities.tasks).toEqual([{ id: 'n1', title: 'New task' }])
  })
})

describe('runAgentLoop iteration cap', () => {
  it('stops the loop and reports partial completion when the cap is hit', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [createBatchCall([{ type: 'task', fields: { title: 'Keeps going' } }])],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'reorganise everything',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 10,
      scopedVerbs: [],
      escalationVerbs: ['reorganise'],
      iterationCap: 2,
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(result.partial).toBe(true)
    expect(result.requestCount).toBe(2)
  })
})

describe('runAgentLoop escalation and validation', () => {
  it('retries exactly once through the high slot on a validator failure', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [createBatchCall([{ type: 'task', fields: { title: 'x', notAllowedField: true } }])],
      }))
      .mockResolvedValueOnce(okResult({ toolCalls: [doneCall()] }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'fix it',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][0].model).toBe(HIGH_SLOT.model)
    expect(result.escalations).toBe(1)
  })

  it('aborts the run when validation fails and no high slot is configured', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [createBatchCall([{ type: 'task', fields: { title: 'x', notAllowedField: true } }])],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'fix it',
      scope: null,
      optimizeFor: 'requests',
      slots: { medium: MEDIUM_SLOT },
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(result.discard).toBe(true)
    expect(result.error.kind).toBe('validation-no-high-slot')
  })

  it('escalates at most twice in a run', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [createBatchCall([{ type: 'task', fields: { title: 'x', notAllowedField: true } }])],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'fix it',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(result.escalations).toBe(1)
    expect(result.discard).toBe(true)
    expect(result.error.kind).toBe('validation-after-escalation')
  })
})

describe('runAgentLoop rate limiting', () => {
  it('keeps the overlay intact and surfaces which slot was limited on a 429', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [createBatchCall([{ type: 'task', fields: { id: 'n1', title: 'Kept' } }])],
      }))
      .mockResolvedValueOnce({ ok: false, error: { kind: 'rateLimit', message: 'slow down' } })

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'reorganise everything',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 10,
      scopedVerbs: [],
      escalationVerbs: ['reorganise'],
    })

    expect(result.rateLimited).toBe(true)
    expect(result.error.slot).toBeDefined()
    expect(result.run.entities.tasks).toEqual([{ id: 'n1', title: 'Kept' }])
  })
})

describe('runAgentLoop auto mode confirmation gating', () => {
  it('still confirms on a delete even in auto mode', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [{ name: 'delete', args: { type: 'task', ids: ['t1'] } }, doneCall()],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'delete task',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
      autoMode: true,
    })

    expect(result.run.status).toBe('awaitingConfirm')
    expect(result.autoConfirmed).toBe(false)
  })

  it('still confirms when a run touches more than the bulk threshold of ops', async () => {
    const items = Array.from({ length: BULK_OP_THRESHOLD + 1 }, (_, i) => ({ type: 'task', fields: { id: `n${i}`, title: `t${i}` } }))
    const send = vi.fn().mockResolvedValue(okResult({ toolCalls: [createBatchCall(items), doneCall()] }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'bulk add',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: items.length,
      scopedVerbs: [],
      escalationVerbs: [],
      autoMode: true,
    })

    expect(result.run.status).toBe('awaitingConfirm')
  })

  it('still confirms when an op touches a class', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [createBatchCall([{ type: 'class', fields: { id: 'c1', name: 'PHIL' } }]), doneCall()],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'add class',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
      autoMode: true,
    })

    expect(result.run.status).toBe('awaitingConfirm')
  })

  it('commits automatically for a plain non-bulk non-delete op in auto mode', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [createBatchCall([{ type: 'task', fields: { id: 'n1', title: 'New task' } }]), doneCall()],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'add task',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
      autoMode: true,
    })

    expect(result.run.status).toBe('committed')
    expect(result.autoConfirmed).toBe(true)
  })
})

describe('runAgentLoop tool mode selection', () => {
  it('omits the query tool in requests mode', async () => {
    const send = vi.fn().mockResolvedValue(okResult({ toolCalls: [doneCall()] }))

    await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'plan',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    const toolNames = send.mock.calls[0][0].tools.map(tool => tool.name)
    expect(toolNames).not.toContain('query')
  })

  it('includes the query tool in tokens mode', async () => {
    const send = vi.fn().mockResolvedValue(okResult({ toolCalls: [doneCall()] }))

    await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'plan',
      scope: null,
      optimizeFor: 'tokens',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    const toolNames = send.mock.calls[0][0].tools.map(tool => tool.name)
    expect(toolNames).toContain('query')
  })
})

describe('runAgentLoop instrumentation', () => {
  it('records which slot and model served each request', async () => {
    const send = vi.fn().mockResolvedValue(okResult({ toolCalls: [doneCall()] }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'plan',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(result.requests).toEqual([
      expect.objectContaining({ slot: 'medium', model: MEDIUM_SLOT.model }),
    ])
  })
})

describe('runAgentLoop read-then-write folder run', () => {
  it('completes in two requests: plan+fetch, then the write batch', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [{ name: 'fetch', args: { ids: ['t1'] } }],
      }))
      .mockResolvedValueOnce(okResult({
        toolCalls: [createBatchCall([{ type: 'task', fields: { id: 'n1', title: 'Follow-up' } }]), doneCall()],
      }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'read task then create a follow-up',
      scope: { type: 'folder', folderId: 'f1' },
      optimizeFor: 'tokens',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(result.requestCount).toBe(2)
  })
})

describe('runAgentLoop one-shot tier', () => {
  it('uses a single request with no tools loop for a scoped single-target verb', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [createBatchCall([{ type: 'task', fields: { id: 'n1', title: 'Done soon' } }])],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'complete t1',
      scope: { type: 'ids', ids: ['t1'] },
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0.95,
      estimatedOpCount: 1,
      scopedVerbs: ['complete'],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(result.requestCount).toBe(1)
  })
})
