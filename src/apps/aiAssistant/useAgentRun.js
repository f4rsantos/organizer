import { useCallback, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { getStrings } from '@/lib/strings'
import { send as sendToModel } from '@/lib/ai/aiClient'
import { loadAiKey, loadBaseUrl } from '@/lib/ai/keys'
import { loadBudgetState, saveBudgetState, recordAiRequest } from '@/lib/ai/budget'
import { runAgentLoop } from '@/lib/ai/runLoop'
import { makeCreateOp } from '@/lib/ai/agentOverlay'
import { formatRunSummary, describeRunError } from './runSummary'
import { saveChatSession } from './chatHistoryDb'
import { nanoid } from '@/lib/ids'

const IDLE = 'idle'
const RUNNING = 'running'
const AWAITING_CONFIRM = 'awaitingConfirm'
const FAILED = 'failed'

function resolveCredentials(providerId) {
  return { apiKey: loadAiKey(providerId), baseUrl: loadBaseUrl(providerId) }
}

function researchNoteBody(result) {
  const sources = (result?.sources ?? [])
    .filter(source => source?.url)
    .map(source => `- [${source.title || source.url}](${source.url})`)
    .join('\n')
  const findings = result?.findings ?? ''
  return sources ? `${findings}\n\n${sources}` : findings
}

function singleFolderScopeId(scope) {
  if (scope?.type === 'folder' && typeof scope.folderId === 'string') return scope.folderId
  return null
}

function researchOpsFromFindings(research, folderId) {
  return (research ?? [])
    .filter(entry => entry?.result?.ok)
    .map(entry => makeCreateOp({
      entityType: 'note',
      id: nanoid(),
      entity: {
        title: entry.query,
        kind: 'text',
        body: researchNoteBody(entry.result),
        folderId: folderId ?? null,
      },
    }))
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

function makeMessage(role, content, runId = null) {
  return { id: nanoid(), role, content, at: Date.now(), ...(runId ? { runId } : {}) }
}

function scopeKey(scope) {
  return JSON.stringify(scope ?? null)
}

export function useAgentRun() {
  const [status, setStatus] = useState(IDLE)
  const [result, setResult] = useState(null)
  const [messages, setMessages] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const cancelledRef = useRef(false)
  const historyRef = useRef([])
  const historyScopeRef = useRef(null)
  const activeChatIdRef = useRef(null)

  const setActiveChat = useCallback(id => {
    activeChatIdRef.current = id
    setActiveChatId(id)
  }, [])

  const startAgentRun = useStore(s => s.startAgentRun)
  const appendAgentOps = useStore(s => s.appendAgentOps)
  const setAgentRunStatus = useStore(s => s.setAgentRunStatus)
  const commitAgentRun = useStore(s => s.commitAgentRun)
  const discardAgentRun = useStore(s => s.discardAgentRun)
  const setActiveTab = useStore(s => s.setActiveTab)

  const start = useCallback(async ({ goal, scope, localTier0, viewingTab }) => {
    cancelledRef.current = false
    setStatus(RUNNING)
    if (!activeChatIdRef.current) setActiveChat(nanoid())
    const chatId = activeChatIdRef.current
    const userMsgId = nanoid()
    const userMsg = { id: userMsgId, role: 'user', content: goal, at: Date.now() }
    setMessages(prev => {
      const next = [...prev, userMsg]
      saveChatSession({
        id: chatId,
        title: next.find(m => m.role === 'user')?.content?.slice(0, 50) || 'Chat',
        messages: next,
        updatedAt: Date.now(),
      })
      return next
    })

    const nextScopeKey = scopeKey(scope)
    if (historyScopeRef.current !== nextScopeKey) {
      historyRef.current = []
      historyScopeRef.current = nextScopeKey
    }

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
      customInstructions: aiSettings.customInstructions,
      viewingTab,
      slots,
      parserConfidence: localTier0?.confidence ?? 0,
      estimatedOpCount: localTier0?.estimatedOpCount ?? 0,
      scopedVerbs: aiSettings.scopedVerbs ?? [],
      escalationVerbs: aiSettings.escalationVerbs ?? [],
      iterationCap: aiSettings.iterationCap,
      autoMode,
      userForcedTier: aiSettings.selectedSlot ?? undefined,
      context: { budgetState: loadBudgetState() },
      localTier0,
      history: historyRef.current,
    })

    if (cancelledRef.current) return null

    if (runOutcome.nextHistory) historyRef.current = runOutcome.nextHistory

    recordRunBudget(runOutcome.requests ?? [])

    if (runOutcome.viewRequests?.length) setActiveTab('aiAssistant')

    const researchOps = researchOpsFromFindings(runOutcome.research, singleFolderScopeId(scope))
    const opsToApply = runOutcome.run ? [...runOutcome.run.ops, ...researchOps] : []

    let runId = null
    if (opsToApply.length) {
      runId = startAgentRun({ scope: runOutcome.run.scope, slot: runOutcome.run.slot, model: runOutcome.run.model })
      appendAgentOps(runId, opsToApply)
      setMessages(prev => prev.map(m => (m.id === userMsgId ? { ...m, runId } : m)))
    }

    const strings = getStrings(state.lang ?? 'en')
    let assistantReply = runOutcome.replySummary
    if (!assistantReply) {
      if (runOutcome.error) {
        const errDesc = describeRunError(runOutcome.error, strings, state)
        assistantReply = errDesc.message || 'I could not complete that change.'
      } else if (runOutcome.research?.length) {
        const findings = runOutcome.research
          .map(r => r?.result?.findings)
          .filter(Boolean)
          .join('\n\n')
        assistantReply = findings || (opsToApply.length ? formatRunSummary(opsToApply, strings) : 'I have researched this for you.')
      } else if (opsToApply.length) {
        assistantReply = formatRunSummary(opsToApply, strings) || 'Done! I have updated your items.'
      } else {
        assistantReply = 'I have completed your request.'
      }
    }

    if (!assistantReply || !assistantReply.trim()) {
      assistantReply = opsToApply.length ? formatRunSummary(opsToApply, strings) || 'Done!' : 'Done!'
    }

    setMessages(prev => {
      const next = [...prev, makeMessage('assistant', assistantReply, runId)]
      saveChatSession({
        id: chatId,
        title: next.find(m => m.role === 'user')?.content?.slice(0, 50) || 'Chat',
        messages: next,
        updatedAt: Date.now(),
      })
      return next
    })

    if (!runOutcome.run) {
      setStatus(FAILED)
      setResult(runOutcome)
      return runOutcome
    }

    if (!opsToApply.length) {
      setStatus(IDLE)
      setResult(runOutcome)
      return runOutcome
    }

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
  }, [appendAgentOps, commitAgentRun, discardAgentRun, setActiveChat, setActiveTab, setAgentRunStatus, startAgentRun])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    setStatus(IDLE)
  }, [])

  const commit = useCallback(targetRunId => {
    const id = targetRunId || result?.runId
    if (id) {
      commitAgentRun(id)
    }
    setStatus(IDLE)
  }, [commitAgentRun, result])

  const discard = useCallback(targetRunId => {
    const id = targetRunId || result?.runId
    if (id) {
      discardAgentRun(id)
    }
    setStatus(IDLE)
    setResult(null)
  }, [discardAgentRun, result])

  const autoMode = useStore(s => s.settings?.apps?.ai?.autoMode === true)
  const updateSettings = useStore(s => s.updateSettings)

  const setAutoMode = useCallback(enabled => {
    const state = useStore.getState()
    const currentApps = state.settings?.apps ?? {}
    updateSettings?.({
      apps: {
        ...currentApps,
        ai: { ...(currentApps.ai ?? {}), autoMode: Boolean(enabled) },
      },
    })
  }, [updateSettings])

  const resetConversation = useCallback(() => {
    cancelledRef.current = true
    historyRef.current = []
    setActiveChat(null)
    setStatus(IDLE)
    setResult(null)
    setMessages([])
  }, [setActiveChat])

  const undoMessages = useCallback(targetRunId => {
    if (!targetRunId) return
    setMessages(prev => {
      const userIdx = prev.findIndex(m => m.runId === targetRunId && m.role === 'user')
      const assistantIdx = prev.findIndex(m => m.runId === targetRunId && m.role === 'assistant')
      if (userIdx === -1 && assistantIdx === -1) return prev
      const next = prev.filter(m => m.runId !== targetRunId)
      const chatId = activeChatIdRef.current
      if (chatId) {
        saveChatSession({
          id: chatId,
          title: next.find(m => m.role === 'user')?.content?.slice(0, 50) || 'Chat',
          messages: next,
          updatedAt: Date.now(),
        })
      }
      return next
    })
  }, [])

  const loadChat = useCallback(chat => {
    if (!chat) return
    cancelledRef.current = true
    historyRef.current = []
    setActiveChat(chat.id)
    setStatus(IDLE)
    setResult(null)
    setMessages(chat.messages || [])
  }, [setActiveChat])

  return { start, cancel, commit, discard, resetConversation, undoMessages, loadChat, activeChatId, status, run: result, messages, autoMode, setAutoMode }
}
