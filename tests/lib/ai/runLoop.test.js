import { describe, it, expect, vi } from 'vitest'
import { runAgentLoop, BULK_OP_THRESHOLD } from '../../../src/lib/ai/runLoop'
import * as research from '../../../src/lib/ai/research'

const MEDIUM_SLOT = { provider: 'anthropic', model: 'claude-medium' }
const HIGH_SLOT = { provider: 'anthropic', model: 'claude-high' }
const SLOTS = { medium: MEDIUM_SLOT, high: HIGH_SLOT }
const GEMINI_SLOT = { provider: 'gemini', model: 'gemini-pro' }
const GEMINI_SLOTS = { medium: GEMINI_SLOT, high: GEMINI_SLOT }

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

describe('runAgentLoop reply summary', () => {
  it('captures the summary from a done tool call so a plain reply can be shown to the user', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [{ name: 'done', args: { summary: 'Nothing due this week.' } }],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'what is left to do this week?',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 0,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(result.replySummary).toBe('Nothing due this week.')
    expect(result.run.ops).toEqual([])
  })

  it('falls back to the raw text reply when the model answers with no tool calls at all', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [],
      usage: { inputTokens: 5, outputTokens: 5 },
    }))
    send.mockResolvedValueOnce({ ok: true, toolCalls: [], usage: { inputTokens: 5, outputTokens: 5 }, finishReason: 'stop', text: 'Hi there!' })

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'hi',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 0,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(result.replySummary).toBe('Hi there!')
    expect(result.run.ops).toEqual([])
  })
})

describe('runAgentLoop conversation history', () => {
  it('sends the full context block on the first turn and returns nextHistory', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [{ name: 'done', args: { summary: 'Sure thing.' } }],
    }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'hi',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 0,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    const sentMessages = send.mock.calls[0][0].messages
    const userMessage = sentMessages.find(m => m.role === 'user')
    expect(userMessage.content).toContain('CONTEXT')
    expect(result.nextHistory).toEqual([
      { role: 'user', content: userMessage.content },
      { role: 'assistant', content: 'Sure thing.' },
    ])
  })

  it('omits the context block on a follow-up turn that carries history, and prepends the history', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [{ name: 'done', args: { summary: 'Done.' } }],
    }))

    const history = [
      { role: 'user', content: 'hi\n\nCONTEXT\n1 tasks' },
      { role: 'assistant', content: 'Hello!' },
    ]

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'move aaa to done',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 0,
      scopedVerbs: [],
      escalationVerbs: [],
      history,
    })

    const sentMessages = send.mock.calls[0][0].messages
    expect(sentMessages).toContainEqual(history[0])
    expect(sentMessages).toContainEqual(history[1])
    const userMessage = sentMessages[sentMessages.length - 1]
    expect(userMessage.content).toBe('move aaa to done')
    expect(userMessage.content).not.toContain('CONTEXT')
    expect(result.nextHistory).toEqual([...history, { role: 'user', content: 'move aaa to done' }, { role: 'assistant', content: 'Done.' }])
  })

  it('refreshes the context block again after CONTEXT_REFRESH_EVERY_TURNS turns of history', async () => {
    const send = vi.fn().mockResolvedValue(okResult({
      toolCalls: [{ name: 'done', args: { summary: 'ok' } }],
    }))

    const history = Array.from({ length: 10 }, (_, i) => (
      i % 2 === 0 ? { role: 'user', content: `turn ${i}` } : { role: 'assistant', content: 'ok' }
    ))

    await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'another one',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 0,
      scopedVerbs: [],
      escalationVerbs: [],
      history,
    })

    const sentMessages = send.mock.calls[0][0].messages
    const userMessage = sentMessages[sentMessages.length - 1]
    expect(userMessage.content).toContain('CONTEXT')
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

  it('uses each slot\'s own optimizeFor rather than a single run-wide setting', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [createBatchCall([{ type: 'task', fields: { title: 'x', notAllowedField: true } }])],
      }))
      .mockResolvedValueOnce(okResult({ toolCalls: [doneCall()] }))

    const slots = {
      medium: { ...MEDIUM_SLOT, optimizeFor: 'requests' },
      high: { ...HIGH_SLOT, optimizeFor: 'tokens' },
    }

    await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'fix it',
      scope: null,
      slots,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    const firstMessages = send.mock.calls[0][0].messages
    const secondMessages = send.mock.calls[1][0].messages
    expect(firstMessages[0].content).toMatch(/Do not call query/)
    expect(secondMessages[0].content).toMatch(/Use query/)
    expect(send.mock.calls[0][0].tools.some(tool => tool.name === 'query')).toBe(false)
    expect(send.mock.calls[1][0].tools.some(tool => tool.name === 'query')).toBe(true)
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

describe('runAgentLoop non-mutating tool calls', () => {
  it('calls into research on a research tool call and continues without ops', async () => {
    const performResearchSpy = vi.spyOn(research, 'performResearch').mockResolvedValue({
      ok: true,
      findings: 'Lisbon is sunny.',
      sources: [{ title: 'Weather site', url: 'https://example.com' }],
      usage: { inputTokens: 1, outputTokens: 1 },
    })

    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [{ name: 'research', args: { query: 'weather in Lisbon' } }],
      }))
      .mockResolvedValueOnce(okResult({ toolCalls: [doneCall()] }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'research the weather',
      scope: null,
      optimizeFor: 'requests',
      slots: GEMINI_SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(performResearchSpy).toHaveBeenCalledTimes(1)
    expect(performResearchSpy).toHaveBeenCalledWith(expect.objectContaining({ query: 'weather in Lisbon', provider: 'gemini' }))
    expect(result.research).toEqual([
      expect.objectContaining({ query: 'weather in Lisbon' }),
    ])
    expect(result.run.ops).toEqual([])

    performResearchSpy.mockRestore()
  })

  it('handles a query tool call without producing ops', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [{ name: 'query', args: { type: 'task', filter: { done: false } } }],
      }))
      .mockResolvedValueOnce(okResult({ toolCalls: [doneCall()] }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'find open tasks',
      scope: null,
      optimizeFor: 'tokens',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(result.run.ops).toEqual([])
  })

  it('handles a fetch tool call without producing ops', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [{ name: 'fetch', args: { ids: ['t1'] } }],
      }))
      .mockResolvedValueOnce(okResult({ toolCalls: [doneCall()] }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'read a task',
      scope: null,
      optimizeFor: 'tokens',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(result.run.ops).toEqual([])
  })

  it('collects openView calls into viewRequests without producing ops', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce(okResult({
        toolCalls: [{ name: 'openView', args: { target: 'notes/f1' } }],
      }))
      .mockResolvedValueOnce(okResult({ toolCalls: [doneCall()] }))

    const result = await runAgentLoop({
      send,
      resolveCredentials,
      clock: fixedClock(),
      store: store(),
      goal: 'open the folder',
      scope: null,
      optimizeFor: 'requests',
      slots: SLOTS,
      parserConfidence: 0,
      estimatedOpCount: 1,
      scopedVerbs: [],
      escalationVerbs: [],
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(result.viewRequests).toEqual(['notes/f1'])
    expect(result.run.ops).toEqual([])
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
