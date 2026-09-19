import { buildContextBlock, buildSystemPrompt, scopedEntities } from '@/lib/ai/context'
import { buildNeutralTools } from '@/lib/ai/tools'
import { routeRun, routeRetry, clampIterationCap, DEFAULT_ITERATION_CAP } from '@/lib/ai/router'
import { canStartRun } from '@/lib/ai/budget'
import { validateOps } from '@/lib/ai/validate'
import { createAgentRun, withRunStatus, makeCreateOp, makeUpdateOp, makeDeleteOp } from '@/lib/ai/agentOverlay'
import { applyOpsToRun } from '@/lib/ai/apply'
import { getProvider } from '@/lib/ai/providers/index'
import { performResearch } from '@/lib/ai/research'
import { docToMarkdownForAgent } from '@/lib/ai/markdown'
import { nanoid } from '@/lib/ids'

export const BULK_OP_THRESHOLD = 5
export const HISTORY_MAX_MESSAGES = 20
export const CONTEXT_REFRESH_EVERY_TURNS = 5
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

const NON_MUTATING_TOOL_NAMES = ['research', 'query', 'fetch', 'openView', 'done']

function isMutatingCall(call) {
  return !NON_MUTATING_TOOL_NAMES.includes(call?.name)
}

const QUERY_ENTITY_LIST_BY_TYPE = {
  task: 'tasks',
  event: 'events',
  note: 'notes',
  folder: 'noteFolders',
  habit: 'habits',
  class: 'classes',
  kanbanCard: 'kanbanCards',
}

function matchesFilter(entity, filter) {
  if (!filter || typeof filter !== 'object') return true
  return Object.entries(filter).every(([key, value]) => entity?.[key] === value)
}

function runQuery({ store, scope, args }) {
  const entities = scopedEntities(store, scope)
  const key = QUERY_ENTITY_LIST_BY_TYPE[args?.type]
  const list = key ? entities[key] ?? [] : []
  return list.filter(entity => matchesFilter(entity, args?.filter))
}

function runFetch({ store, args }) {
  const ids = args?.ids ?? []
  const notes = store?.notes ?? []
  return ids
    .map(id => notes.find(note => note.id === id))
    .filter(Boolean)
    .map(note => {
      let bodyMarkdown = ''
      try {
        const doc = note.doc ?? (typeof note.body === 'string' && note.body.startsWith('{') ? JSON.parse(note.body) : null)
        if (doc?.type === 'doc') {
          bodyMarkdown = docToMarkdownForAgent(doc).markdown
        } else {
          bodyMarkdown = note.body ?? ''
        }
      } catch {
        bodyMarkdown = note.body ?? ''
      }
      return { id: note.id, type: 'note', title: note.title ?? '', body: bodyMarkdown }
    })
}

function describeResearchResult(query, result) {
  if (!result?.ok) {
    return `Research for "${query}" failed: ${result?.error?.message ?? result?.error?.kind ?? 'unknown error'}.`
  }
  const sourceLines = (result.sources ?? []).map(source => `- ${source.title || source.url}: ${source.url}`)
  return [`Research findings for "${query}":`, result.findings ?? '', ...sourceLines].filter(Boolean).join('\n')
}

function describeQueryResult(args, matches) {
  if (!matches.length) return `Query ${args?.type ?? ''} matched no items.`
  const lines = matches.map(item => `${item.id}  ${item.title ?? item.name ?? ''}`)
  return [`Query ${args?.type ?? ''} matched ${matches.length} item(s):`, ...lines].join('\n')
}

function describeFetchResult(fetched) {
  if (!fetched.length) return 'Fetch returned no matching items.'
  const lines = fetched.map(item => `${item.id}  "${item.title}"\n${item.body}`)
  return ['Fetched item(s):', ...lines].join('\n\n')
}

async function handleNonMutatingToolCalls({ toolCalls, store, scope, currentSlot, resolveCredentials, instrumentation }) {
  const transcriptMessages = []
  const viewRequests = []

  for (const call of toolCalls ?? []) {
    if (call?.name === 'research') {
      const query = call.args?.query ?? ''
      const providerId = currentSlot?.provider
      const result = hasGrounding(providerId)
        ? await performResearch({
          query,
          provider: providerId,
          credentials: resolveCredentials?.(providerId),
          model: currentSlot?.model,
        })
        : { ok: false, findings: '', sources: [], error: { kind: 'unsupported' } }
      instrumentation.research.push({ query, result })
      transcriptMessages.push({ role: 'tool', content: describeResearchResult(query, result) })
      continue
    }

    if (call?.name === 'query') {
      const matches = runQuery({ store, scope, args: call.args })
      transcriptMessages.push({ role: 'tool', content: describeQueryResult(call.args, matches) })
      continue
    }

    if (call?.name === 'fetch') {
      const fetched = runFetch({ store, args: call.args })
      transcriptMessages.push({ role: 'tool', content: describeFetchResult(fetched) })
      continue
    }

    if (call?.name === 'openView') {
      viewRequests.push(call.args?.target)
      transcriptMessages.push({ role: 'tool', content: `Opened view: ${call.args?.target ?? ''}` })
      continue
    }
  }

  return { transcriptMessages, viewRequests }
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
  return (toolCalls ?? []).filter(isMutatingCall).flatMap(call => toolCallToOps(call, run))
}

function requiresConfirmation(ops) {
  if (!ops.length) return false
  if (ops.some(op => op.type === 'delete')) return true
  if (ops.length > BULK_OP_THRESHOLD) return true
  if (ops.some(op => STRUCTURAL_ENTITY_TYPES.includes(op.entityType))) return true
  return false
}

function buildMessages({ goal, contextBlock, systemPrompt, transcript, history, forceContext }) {
  const hasHistory = Array.isArray(history) && history.length > 0
  const userContent = forceContext ? `${goal}\n\nCONTEXT\n${contextBlock}` : goal
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(hasHistory ? history : []),
    { role: 'user', content: userContent },
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

function slotOptimizeFor(slot, fallback) {
  return slot?.optimizeFor ?? fallback ?? 'requests'
}

async function runOneShot({ send, slot, credentials, goal, scope, optimizeFor, customInstructions, run, store, context, instrumentation }) {
  const effectiveOptimizeFor = slotOptimizeFor(slot, optimizeFor)
  const systemPrompt = buildSystemPrompt({ optimizeFor: effectiveOptimizeFor, customInstructions })
  const contextBlock = buildContextBlock({ store, scope, optimizeFor: effectiveOptimizeFor })
  const tools = toolsForSlot({ optimizeFor: effectiveOptimizeFor, providerId: slot?.provider })
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
  const replySummary = (result.text && result.text.trim()) ? result.text : fallbackReplySummary(nextRun.ops)
  return { status: 'awaitingConfirm', run: nextRun, rejected, replySummary }
}

export async function runAgentLoop({
  send,
  clock,
  resolveCredentials,
  store,
  goal,
  scope,
  optimizeFor,
  customInstructions,
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
  history = [],
}) {
  const instrumentation = { requests: [], startedAt: nowMs(clock), escalations: 0, research: [], viewRequests: [] }

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
      customInstructions,
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
      replySummary: oneShotResult.replySummary ?? null,
    })
  }

  const cap = clampIterationCap(iterationCap ?? DEFAULT_ITERATION_CAP)
  const transcript = []
  let currentSlot = route.slot
  let currentSlotName = routeSlotName(route)
  let escalated = false
  let doneSignalled = false
  let replySummary = null
  let failure = null
  let turnUserContent = null
  let lastAssistantText = null

  for (let iteration = 0; iteration < cap; iteration += 1) {
    const effectiveOptimizeFor = slotOptimizeFor(currentSlot, optimizeFor)
    const systemPrompt = buildSystemPrompt({ optimizeFor: effectiveOptimizeFor, customInstructions })
    const contextBlock = buildContextBlock({ store, scope, optimizeFor: effectiveOptimizeFor })
    const turnNumber = Math.floor(history.length / 2)
    const needsFreshContext = history.length === 0 || turnNumber % CONTEXT_REFRESH_EVERY_TURNS === 0
    if (turnUserContent === null) {
      turnUserContent = needsFreshContext ? `${goal}\n\nCONTEXT\n${contextBlock}` : goal
    }
    const messages = buildMessages({ goal, contextBlock, systemPrompt, transcript, history, forceContext: needsFreshContext })
    const tools = toolsForSlot({ optimizeFor: effectiveOptimizeFor, providerId: currentSlot?.provider })
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

    const { transcriptMessages: nonMutatingMessages, viewRequests } = await handleNonMutatingToolCalls({
      toolCalls: result.toolCalls,
      store,
      scope,
      currentSlot,
      resolveCredentials,
      instrumentation,
    })
    if (result.text) {
      lastAssistantText = result.text
    }

    if (viewRequests.length) {
      instrumentation.viewRequests.push(...viewRequests)
    }

    if (doneCall || !result.toolCalls?.length) {
      doneSignalled = true
      replySummary = doneCall?.args?.summary ?? (result.text || lastAssistantText) ?? null
      break
    }

    transcript.push({ role: 'assistant', content: result.text ?? '', toolCalls: result.toolCalls })
    transcript.push({ role: 'tool', content: describeAppliedOps(accepted) })
    transcript.push(...nonMutatingMessages)
  }

  if (failure) {
    return finalizeResult({ run, instrumentation, clock, error: failure, partial: false, discard: true })
  }

  if (!replySummary && lastAssistantText) {
    replySummary = lastAssistantText
  }

  if (!replySummary || !replySummary.trim()) {
    replySummary = fallbackReplySummary(run.ops)
  }

  const partial = !doneSignalled
  const nextHistory = [
    ...history,
    { role: 'user', content: turnUserContent ?? goal },
    { role: 'assistant', content: replySummary ?? '' },
  ].slice(-HISTORY_MAX_MESSAGES)
  return finalizeResult({
    run: withRunStatus(run, autoMode && !requiresConfirmation(run.ops) ? 'committed' : 'awaitingConfirm'),
    instrumentation,
    clock,
    autoConfirmed: Boolean(autoMode) && !requiresConfirmation(run.ops),
    partial,
    replySummary,
    nextHistory,
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

function fallbackReplySummary(ops) {
  if (!ops?.length) return 'Done.'
  return `Done — applied ${ops.length} change(s).`
}

function finalizeResult({ run, instrumentation, clock, error = null, partial = false, autoConfirmed = false, discard = false, rateLimited = false, replySummary = null, nextHistory = null }) {
  const usage = totalUsage(instrumentation)
  return {
    run,
    requestCount: instrumentation.requests.length,
    requests: instrumentation.requests,
    usage,
    wallClockMs: nowMs(clock) - instrumentation.startedAt,
    escalations: instrumentation.escalations,
    research: instrumentation.research ?? [],
    viewRequests: instrumentation.viewRequests ?? [],
    replySummary,
    nextHistory,
    error,
    partial,
    autoConfirmed,
    discard,
    rateLimited,
  }
}
