import { useEffect, useState } from 'react'
import { MessageSquare, LayoutGrid } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { useAgentRun } from './useAgentRun'
import { ConversationPane } from './panes/ConversationPane'
import { TargetPane } from './panes/TargetPane'
import { ChatHistoryDrawer } from './panes/ChatHistoryDrawer'
import { SwipePager } from '@/components/calendar/SwipePager'

const VIEW_CONVERSATION = 'conversation'
const VIEW_TARGET = 'target'

function contextGoalPrefill(request) {
  return request?.suggestionText || ''
}

function MobileViewSwitch({ view, onChange, t }) {
  return (
    <div className="flex items-center gap-4 px-3 pt-3 md:hidden">
      <button
        type="button"
        onClick={() => onChange(VIEW_CONVERSATION)}
        className={cn(
          'flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 -mb-px transition-colors',
          view === VIEW_CONVERSATION
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground',
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {t.aiViewConversation}
      </button>
      <button
        type="button"
        onClick={() => onChange(VIEW_TARGET)}
        className={cn(
          'flex items-center gap-1.5 pb-2 text-xs font-medium border-b-2 -mb-px transition-colors',
          view === VIEW_TARGET
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        {t.aiViewTarget}
      </button>
    </div>
  )
}

function hasTargetContent(run, status) {
  if (status === 'failed') return false
  if (!run) return false
  const scope = run?.run?.scope ?? null
  if (scope && scope.type !== 'global') return true
  return (run?.run?.ops?.length ?? 0) > 0 || (run?.ops?.length ?? 0) > 0
}

export function AiTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const undoAgentRun = useStore(s => s.undoAgentRun)
  const aiContextRequest = useStore(s => s.aiContextRequest)
  const clearAiContextRequest = useStore(s => s.clearAiContextRequest)

  const { start, cancel, commit, discard, resetConversation, undoMessages, loadChat, activeChatId, status, run, messages, autoMode, setAutoMode } = useAgentRun()
  const [mobileView, setMobileView] = useState(VIEW_CONVERSATION)
  const [targetHidden, setTargetHidden] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [contextGoal, setContextGoal] = useState(null)
  const [viewingTab, setViewingTab] = useState(null)
  const [viewingNoteId, setViewingNoteId] = useState(null)

  const scope = run?.run?.scope ?? null
  const runHasTarget = hasTargetContent(run, status)
  const showTarget = runHasTarget || Boolean(viewingTab)
  const viewRequests = run?.viewRequests ?? []

  const [clearedViewingForRun, setClearedViewingForRun] = useState(false)
  if (runHasTarget && viewingTab && !clearedViewingForRun) {
    setClearedViewingForRun(true)
    setViewingTab(null)
    setViewingNoteId(null)
  }
  if (!runHasTarget && clearedViewingForRun) {
    setClearedViewingForRun(false)
  }

  const [prevViewRequestsLen, setPrevViewRequestsLen] = useState(0)
  if (viewRequests.length !== prevViewRequestsLen) {
    if (viewRequests.length > prevViewRequestsLen) setTargetHidden(false)
    setPrevViewRequestsLen(viewRequests.length)
  }

  useEffect(() => {
    if (!aiContextRequest) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContextGoal(contextGoalPrefill(aiContextRequest))
    setViewingTab(aiContextRequest.suggestionText ? null : (aiContextRequest.tab ?? null))
    setViewingNoteId(aiContextRequest.noteId ?? null)
    setTargetHidden(false)
    setMobileView(VIEW_CONVERSATION)
    clearAiContextRequest()
  }, [aiContextRequest, clearAiContextRequest])

  const handleStart = goal => { start({ goal, scope, viewingTab }) }
  const handleCommit = runId => { commit(runId) }
  const handleDiscard = runId => { discard(runId) }
  const handleUndo = runId => {
    undoAgentRun(runId)
    undoMessages(runId)
  }

  const conversation = (
    <div className="flex flex-col h-full min-h-0">
      <ConversationPane
        status={status}
        run={run}
        messages={messages}
        scope={scope}
        onStart={handleStart}
        onCancel={cancel}
        onCommit={handleCommit}
        onDiscard={handleDiscard}
        onUndo={handleUndo}
        onNewConversation={resetConversation}
        onOpenHistory={() => setIsHistoryOpen(true)}
        targetHidden={targetHidden}
        showTarget={showTarget}
        onShowTarget={() => setTargetHidden(false)}
        autoMode={autoMode}
        onSetAutoMode={setAutoMode}
        prefillGoal={contextGoal}
        viewingTab={viewingTab}
        t={t}
      />
    </div>
  )

  const target = (
    <div className="h-full min-h-0 flex flex-col">
      <TargetPane scope={scope} run={run} viewingTab={viewingTab} viewingNoteId={viewingNoteId} onHide={() => setTargetHidden(true)} t={t} />
    </div>
  )

  const isTargetVisible = showTarget && !targetHidden

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        activeChatId={activeChatId}
        workingChatId={status === 'running' ? activeChatId : null}
        onSelectChat={chat => {
          loadChat(chat)
          setIsHistoryOpen(false)
        }}
        onNewChat={() => {
          resetConversation()
          setIsHistoryOpen(false)
        }}
        t={t}
      />

      <div className="hidden md:flex flex-1 min-h-0 px-4 md:px-6 pt-3 md:pt-4 pb-4">
        <div className={cn('flex flex-col min-h-0 transition-all duration-300 ease-in-out', isTargetVisible ? 'w-[40%] min-w-[320px] max-w-[480px]' : 'flex-1')}>
          {conversation}
        </div>
        {isTargetVisible && (
          <div className="flex-1 min-w-0 border-l border-border pl-3 md:pl-4 flex flex-col transition-all duration-300 ease-in-out animate-in fade-in">
            {target}
          </div>
        )}
      </div>

      {isTargetVisible ? (
        <div className="flex md:hidden flex-col flex-1 min-h-0">
          <MobileViewSwitch view={mobileView} onChange={setMobileView} t={t} />
          <SwipePager
            pageKey={mobileView}
            renderPage={offset => {
              const view = offset === 0
                ? mobileView
                : (mobileView === VIEW_CONVERSATION ? VIEW_TARGET : VIEW_CONVERSATION)
              return view === VIEW_CONVERSATION ? conversation : target
            }}
            onPrev={() => setMobileView(VIEW_CONVERSATION)}
            onNext={() => setMobileView(VIEW_TARGET)}
            canPrev={mobileView !== VIEW_CONVERSATION}
            canNext={mobileView !== VIEW_TARGET}
          />
        </div>
      ) : (
        <div className="flex md:hidden flex-col flex-1 min-h-0">
          {conversation}
        </div>
      )}
    </div>
  )
}
