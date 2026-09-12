import { buildContextBlock, buildSystemPrompt } from '@/lib/ai/context'
import { buildNeutralTools } from '@/lib/ai/tools'
import { routeRun, routeRetry, clampIterationCap, DEFAULT_ITERATION_CAP } from '@/lib/ai/router'
import { canStartRun } from '@/lib/ai/budget'
import { validateOps } from '@/lib/ai/validate'
import { createAgentRun, withRunStatus, makeCreateOp, makeUpdateOp, makeDeleteOp } from '@/lib/ai/agentOverlay'
import { applyOpsToRun } from '@/lib/ai/apply'
import { getProvider } from '@/lib/ai/providers/index'
import { nanoid } from '@/lib/ids'

export const BULK_OP_THRESHOLD = 5
const STRUCTURAL_ENTITY_TYPES = ['class', 'semester']

function nowMs(clock) {
  return clock?.now ? clock.now() : Date.now()
}

function toolCallToOps(call, run) {
  if (!call || typeof call !== 'object') return []
  const { name, args } = call
  const type = args?.type

  if (name === 'create') {
    return (args?.items ?? []).map(item => {
      const { id: fieldId, ...entity } = item?.fields ?? {}
      return makeCreateOp({
        entityType: item?.type ?? type,
        id: fieldId ?? item?.id ?? nanoid(),
        entity,
      })
    })
  }

  if (name === 'update') {
    return (args?.patches ?? []).map(patch => makeUpdateOp({
      entityType: patch?.type ?? type,
      targetId: patch?.id,
      patch: patch?.fields ?? {},
      priorPatch: priorPatchFor(run, patch?.type ?? type, patch?.id, patch?.fields ?? {}),
    }))
  }

  if (name === 'delete') {
    return (args?.ids ?? []).map(id => makeDeleteOp({
      entityType: type,
      targetId: id,
      priorEntity: priorEntityFor(run, type, id),
    }))
  }

  return []
}

function priorPatchFor(run, entityType, targetId, patch) {
  const priorEntity = priorEntityFor(run, entityType, targetId)
  const priorPatch = {}
  for (const key of Object.keys(patch ?? {})) {
    priorPatch[key] = priorEntity?.[key]
  }
  return priorPatch
}

const ENTITY_LIST_BY_TYPE = { task: 'tasks', event: 'events', note: 'notes', folder: 'folders' }

function priorEntityFor(run, entityType, targetId) {
  if (entityType === 'kanbanCard') {
    return run?.entities?.kanban?.cards?.find(item => item.id === targetId) ?? null
  }
  const key = ENTITY_LIST_BY_TYPE[entityType]
  if (!key) return null
  return run?.entities?.[key]?.find(item => item.id === targetId) ?? null
}

function isDoneCall(call) {
  return call?.name === 'done'
}

function hasGrounding(providerId) {
  return Boolean(getProvider(providerId)?.capabilities?.grounding)
}

function toolsForSlot({ optimizeFor, providerId }) {
  const tools = buildNeutralTools({ optimizeFor })
  if (hasGrounding(providerId)) return tools
  return tools.filter(tool => tool.name !== 'research')
}

function opsFromToolCalls(toolCalls, run) {
  return (toolCalls ?? []).filter(call => !isDoneCall(call)).flatMap(call => toolCallToOps(call, run))
}

function requiresConfirmation(ops) {
  if (!ops.length) return false
  if (ops.some(op => op.type === 'delete')) return true
  if (ops.length > BULK_OP_THRESHOLD) return true
  if (ops.some(op => STRUCTURAL_ENTITY_TYPES.includes(op.entityType))) return true
  return false
}

function buildMessages({ goal, contextBlock, systemPrompt, transcript }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${goal}\n\nCONTEXT\n${contextBlock}` },
  ]
  return [...messages, ...transcript]
}

function recordInstrumentation(instrumentation, entry) {
  instrumentation.requests.push(entry)
}

function totalUsage(instrumentation) {
  return instrumentation.requests.reduce((acc, req) => ({
    inputTokens: acc.inputTokens + (req.usage?.inputTokens ?? 0),
    outputTokens: acc.outputTokens + (req.usage?.outputTokens ?? 0),
  }), { inputTokens: 0, outputTokens: 0 })
}

async function runOneShot({ send, slot, credentials, goal, scope, optimizeFor, run, store, context, instrumentation }) {
  const systemPrompt = buildSystemPrompt({ optimizeFor })
  const contextBlock = buildContextBlock({ store, scope, optimizeFor })
  const tools = toolsForSlot({ optimizeFor, providerId: slot?.provider })
  const messages = buildMessages({ goal, contextBlock, systemPrompt, transcript: [] })

  const result = await send({
    provider: slot?.provider,
    baseUrl: credentials?.baseUrl,
    apiKey: credentials?.apiKey,
    model: slot?.model,
    messages,
    tools,
    stream: false,
  })

  recordInstrumentation(instrumentation, { slot: 'oneShot', model: slot?.model, usage: result.usage, ok: result.ok })

  if (!result.ok) {
    return { status: 'failed', run, error: result.error }
  }

  const proposedOps = opsFromToolCalls(result.toolCalls, run)
  const { accepted, rejected } = validateOps(proposedOps, { store, run, scope, context })

  if (rejected.length && !accepted.length) {
    return { status: 'failed', run, error: { kind: 'validation', rejected } }
  }

  const nextRun = applyOpsToRun(run, accepted)
  return { status: 'awaitingConfirm', run: nextRun, rejected }
}

export async function runAgentLoop({
  send,
  clock,
  resolveCredentials,
  store,
  goal,
  scope,
  optimizeFor,
  slots,
  parserConfidence,
  userForcedTier,
  estimatedOpCount,
  scopedVerbs,
  escalationVerbs,
  iterationCap,
  autoMode,
  context = {},
  localTier0,
}) {
  const instrumentation = { requests: [], startedAt: nowMs(clock), escalations: 0 }

  if (localTier0?.matched) {
    const run = createAgentRun({ runId: localTier0.runId, scope, slot: null, model: null })
    const nextRun = applyOpsToRun(run, localTier0.ops ?? [])
    return finalizeResult({
      run: withRunStatus(nextRun, autoMode && !requiresConfirmation(localTier0.ops ?? []) ? 'committed' : 'awaitingConfirm'),
      instrumentation,
      clock,
      autoConfirmed: Boolean(autoMode) && !requiresConfirmation(localTier0.ops ?? []),
      partial: false,
    })
  }

  const route = routeRun({
    goal, scope, parserConfidence, userForcedTier, estimatedOpCount, scopedVerbs, escalationVerbs, slots,
  })

  if (!route.slot) {
    return finalizeResult({
      run: null, instrumentation, clock, error: { kind: 'no-slot-configured' }, partial: false,
    })
  }

  const budgetCheck = canStartRun({
    state: context.budgetState, slotName: routeSlotName(route), dailyCap: routeDailyCap(route, slots),
    estimatedRequestsNeeded: route.tier === 'oneShot' ? 1 : clampIterationCap(iterationCap ?? DEFAULT_ITERATION_CAP),
  })

  if (!budgetCheck.allowed) {
    return finalizeResult({
      run: null, instrumentation, clock, error: { kind: 'budget-exhausted', reason: budgetCheck.reason }, partial: false,
    })
  }

  let run = createAgentRun({ runId: context.runId, scope, slot: routeSlotName(route), model: route.slot.model })

  if (route.tier === 'oneShot') {
    const oneShotResult = await runOneShot({
      send,
      slot: route.slot,
      credentials: resolveCredentials?.(route.slot?.provider),
      goal,
      scope,
      optimizeFor,
      run,
      store,
      context,
      instrumentation,
    })
    if (oneShotResult.status === 'failed') {
      return finalizeResult({ run, instrumentation, clock, error: oneShotResult.error, partial: false })
    }
    return finalizeResult({
      run: withRunStatus(oneShotResult.run, autoMode && !requiresConfirmation(oneShotResult.run.ops) ? 'committed' : 'awaitingConfirm'),
      instrumentation,
      clock,
      autoConfirmed: Boolean(autoMode) && !requiresConfirmation(oneShotResult.run.ops),
      partial: false,
    })
  }

  const cap = clampIterationCap(iterationCap ?? DEFAULT_ITERATION_CAP)
  const systemPrompt = buildSystemPrompt({ optimizeFor })
  const transcript = []
  let currentSlot = route.slot
  let currentSlotName = routeSlotName(route)
  let escalated = false
  let doneSignalled = false
  let failure = null

  for (let iteration = 0; iteration < cap; iteration += 1) {
    const contextBlock = buildContextBlock({ store, scope, optimizeFor })
    const messages = buildMessages({ goal, contextBlock, systemPrompt, transcript })
    const tools = toolsForSlot({ optimizeFor, providerId: currentSlot?.provider })
    const credentials = resolveCredentials?.(currentSlot?.provider)

    const result = await send({
      provider: currentSlot?.provider,
      baseUrl: credentials?.baseUrl,
      apiKey: credentials?.apiKey,
      model: currentSlot?.model,
      messages,
      tools,
      stream: false,
    })

    recordInstrumentation(instrumentation, {
      slot: currentSlotName, model: currentSlot?.model, usage: result.usage, ok: result.ok, iteration,
    })

    if (!result.ok) {
      if (result.error?.kind === 'rateLimit') {
        return finalizeResult({
          run,
          instrumentation,
          clock,
          error: { kind: 'rateLimit', slot: currentSlotName },
          partial: run.ops.length > 0,
          rateLimited: true,
        })
      }
      failure = result.error
      break
    }

    const proposedOps = opsFromToolCalls(result.toolCalls, run)
    const { accepted, rejected } = validateOps(proposedOps, { store, run, scope, context })

    if (accepted.length) {
      run = applyOpsToRun(run, accepted)
    }

    const modelSelfReportedLowConfidence = Boolean(result.lowConfidence)

    if (rejected.length || modelSelfReportedLowConfidence) {
      if (!escalated) {
        const retryRoute = routeRetry({ slots })
        escalated = true
        instrumentation.escalations += 1
        if (retryRoute.slot) {
          currentSlot = retryRoute.slot
          currentSlotName = routeSlotName(retryRoute)
          transcript.push({ role: 'user', content: describeRejections(rejected) })
          continue
        }
        failure = { kind: 'validation-no-high-slot', rejected }
        break
      }
      failure = { kind: 'validation-after-escalation', rejected }
      break
    }

    const doneCall = (result.toolCalls ?? []).find(isDoneCall)
    if (doneCall || !result.toolCalls?.length) {
      doneSignalled = true
      break
    }

    transcript.push({ role: 'assistant', content: result.text ?? '', toolCalls: result.toolCalls })
    transcript.push({ role: 'tool', content: describeAppliedOps(accepted) })
  }

  if (failure) {
    return finalizeResult({ run, instrumentation, clock, error: failure, partial: false, discard: true })
  }

  const partial = !doneSignalled
  return finalizeResult({
    run: withRunStatus(run, autoMode && !requiresConfirmation(run.ops) ? 'committed' : 'awaitingConfirm'),
    instrumentation,
    clock,
    autoConfirmed: Boolean(autoMode) && !requiresConfirmation(run.ops),
    partial,
  })
}

function routeSlotName(route) {
  return route?.slotName ?? 'medium'
}

function routeDailyCap(route, slots) {
  const slotName = routeSlotName(route)
  return slots?.[slotName]?.dailyCap
}

function describeRejections(rejected) {
  const lines = rejected.map(r => `${r.op?.type ?? 'op'} ${r.op?.entityType ?? ''} rejected: ${r.reason}`)
  return `Some operations were rejected. Fix and resubmit:\n${lines.join('\n')}`
}

function describeAppliedOps(ops) {
  if (!ops.length) return 'No operations applied.'
  return `Applied ${ops.length} operation(s). Continue planning or call done.`
}

function finalizeResult({ run, instrumentation, clock, error = null, partial = false, autoConfirmed = false, discard = false, rateLimited = false }) {
  const usage = totalUsage(instrumentation)
  return {
    run,
    requestCount: instrumentation.requests.length,
    requests: instrumentation.requests,
    usage,
    wallClockMs: nowMs(clock) - instrumentation.startedAt,
    escalations: instrumentation.escalations,
    error,
    partial,
    autoConfirmed,
    discard,
    rateLimited,
  }
}
