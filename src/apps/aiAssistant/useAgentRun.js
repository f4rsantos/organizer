import { useCallback, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { send as sendToModel } from '@/lib/ai/aiClient'
import { loadAiKey, loadBaseUrl } from '@/lib/ai/keys'
import { loadBudgetState, saveBudgetState, recordAiRequest } from '@/lib/ai/budget'
import { runAgentLoop } from '@/lib/ai/runLoop'

const IDLE = 'idle'
const RUNNING = 'running'
const AWAITING_CONFIRM = 'awaitingConfirm'
const FAILED = 'failed'

function resolveCredentials(providerId) {
  return { apiKey: loadAiKey(providerId), baseUrl: loadBaseUrl(providerId) }
}

function recordRunBudget(requests) {
  let state = loadBudgetState()
  for (const request of requests) {
    state = recordAiRequest(state, {
      slotName: request.slot,
      model: request.model,
      requestCount: 1,
      inputTokens: request.usage?.inputTokens,
      outputTokens: request.usage?.outputTokens,
    })
  }
  saveBudgetState(state)
}

export function useAgentRun() {
  const [status, setStatus] = useState(IDLE)
  const [result, setResult] = useState(null)
  const cancelledRef = useRef(false)

  const startAgentRun = useStore(s => s.startAgentRun)
  const appendAgentOps = useStore(s => s.appendAgentOps)
  const setAgentRunStatus = useStore(s => s.setAgentRunStatus)
  const commitAgentRun = useStore(s => s.commitAgentRun)
  const discardAgentRun = useStore(s => s.discardAgentRun)

  const start = useCallback(async ({ goal, scope, localTier0 }) => {
    cancelledRef.current = false
    setStatus(RUNNING)
    setResult(null)

    const state = useStore.getState()
    const aiSettings = state.settings?.apps?.ai ?? {}
    const optimizeFor = aiSettings.optimizeFor ?? 'requests'
    const slots = aiSettings.slots ?? {}
    const autoMode = aiSettings.autoMode === true

    const runOutcome = await runAgentLoop({
      send: sendToModel,
      resolveCredentials,
      clock: { now: () => Date.now() },
      store: state,
      goal,
      scope: scope ?? null,
      optimizeFor,
      slots,
      parserConfidence: localTier0?.confidence ?? 0,
      estimatedOpCount: localTier0?.estimatedOpCount ?? 0,
      scopedVerbs: aiSettings.scopedVerbs ?? [],
      escalationVerbs: aiSettings.escalationVerbs ?? [],
      iterationCap: aiSettings.iterationCap,
      autoMode,
      context: { budgetState: loadBudgetState() },
      localTier0,
    })

    if (cancelledRef.current) return null

    recordRunBudget(runOutcome.requests ?? [])

    if (!runOutcome.run) {
      setStatus(FAILED)
      setResult(runOutcome)
      return runOutcome
    }

    const runId = startAgentRun({ scope: runOutcome.run.scope, slot: runOutcome.run.slot, model: runOutcome.run.model })
    if (runOutcome.run.ops.length) appendAgentOps(runId, runOutcome.run.ops)

    if (runOutcome.discard) {
      discardAgentRun(runId)
      setStatus(FAILED)
      setResult(runOutcome)
      return runOutcome
    }

    if (runOutcome.autoConfirmed) {
      setAgentRunStatus(runId, 'committed')
      commitAgentRun(runId)
      setStatus(IDLE)
      setResult({ ...runOutcome, runId })
      return { ...runOutcome, runId }
    }

    setAgentRunStatus(runId, 'awaitingConfirm')
    setStatus(AWAITING_CONFIRM)
    setResult({ ...runOutcome, runId })
    return { ...runOutcome, runId }
  }, [appendAgentOps, commitAgentRun, discardAgentRun, setAgentRunStatus, startAgentRun])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    setStatus(IDLE)
  }, [])

  return { start, cancel, status, run: result }
}
