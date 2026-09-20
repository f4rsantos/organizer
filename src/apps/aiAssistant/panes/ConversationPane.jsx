import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ArrowUp, Square, Mic, MicOff, RotateCcw, Plus, History, PanelRightOpen, Copy, Check, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import { useWeatherForecast } from '@/hooks/useWeatherForecast'
import { weatherCategory } from '@/lib/weather'
import { PlanConfirmPane } from './PlanConfirmPane'
import { describeRunError } from '../runSummary'
import { getSessionGreeting } from '../greetings'

const TEXTAREA_MAX_HEIGHT_PX = 200

function scopeChipLabel(scope, t) {
  if (!scope || scope.type === 'global') return null
  if (scope.type === 'folder') return t.aiScopeFolder
  if (scope.type === 'class') return t.aiScopeClass
  if (scope.type === 'semester') return t.aiScopeSemester
  if (Array.isArray(scope.ids) && scope.ids.length) return t.aiScopeSelection
  return null
}

function ScopeChip({ scope, t }) {
  const label = scopeChipLabel(scope, t)
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
      {label}
    </span>
  )
}

function ViewingTabChip({ viewingTab, t }) {
  const label = t[viewingTab]
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs text-primary">
      {label}
    </span>
  )
}

function FailureDetail({ error, onRetry, onDismiss, t }) {
  const store = useStore.getState()
  const { message, rejected } = describeRunError(error, t, store)
  return (
    <div className="space-y-2">
      <p className="text-sm text-destructive">{message}</p>
      {rejected.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {rejected.map((row, index) => {
            const fallback = row.entityType === 'kanbanCard' ? (t.aiTargetCard ?? 'Card')
              : row.entityType === 'task' ? (t.aiTargetTask ?? 'Task')
              : t.aiTargetUntitled
            return (
              <li key={index}>
                {row.label || fallback} — {row.reason}
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex items-center gap-2 pt-0.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            {t.aiRetry ?? 'Retry'}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
          >
            {t.aiDismiss ?? 'Dismiss'}
          </button>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message, onUndo, canUndo, t }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className={cn('flex flex-col gap-0.5', isUser ? 'items-end' : 'items-start')}>
      <div className={cn('flex items-center gap-1.5 max-w-full min-w-0', isUser ? 'justify-end' : 'justify-start')}>
        {isUser && canUndo && (
          <button
            type="button"
            onClick={() => onUndo(message.runId)}
            title={t.aiJournalUndo}
            aria-label={t.aiJournalUndo}
            className="p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <p
          className={cn(
            'w-fit max-w-full whitespace-pre-wrap break-words text-sm rounded-2xl px-3 py-2',
            isUser ? 'bg-secondary text-foreground' : 'text-foreground',
          )}
        >
          {message.content}
        </p>
      </div>
      {!isUser && (
        <button
          type="button"
          onClick={handleCopy}
          title={t.aiCopyReply ?? 'Copy'}
          aria-label={t.aiCopyReply ?? 'Copy'}
          className="ml-1 flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1 py-0.5 rounded"
        >
          {copied
            ? <><Check className="h-3 w-3" />{t.aiCopied ?? 'Copied'}</>
            : <><Copy className="h-3 w-3" />{t.aiCopyReply ?? 'Copy'}</>}
        </button>
      )}
    </div>
  )
}

function AutoGrowTextarea({ value, onChange, onKeyDown, placeholder, disabled }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={cn(
        'w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm outline-none',
        'placeholder:text-muted-foreground disabled:opacity-50',
      )}
      style={{ maxHeight: TEXTAREA_MAX_HEIGHT_PX }}
    />
  )
}

function useActiveSlots() {
  const slots = useStore(s => s.settings?.apps?.ai?.slots ?? {})
  const storedSelected = useStore(s => s.settings?.apps?.ai?.selectedSlot)
  const updateSettings = useStore(s => s.updateSettings)

  const activeSlots = useMemo(() => {
    const list = []
    for (const name of ['low', 'medium', 'high']) {
      const slot = slots[name]
      if (slot?.provider && slot?.model?.trim()) {
        list.push({ name, model: slot.model.trim(), provider: slot.provider })
      }
    }
    return list
  }, [slots])

  const selectedSlot = useMemo(() => {
    if (storedSelected && activeSlots.some(s => s.name === storedSelected)) {
      return storedSelected
    }
    return activeSlots.find(s => s.name === 'medium')?.name ?? activeSlots[0]?.name ?? 'medium'
  }, [storedSelected, activeSlots])

  const setSelectedSlot = useCallback(nextSlot => {
    const currentApps = useStore.getState().settings?.apps ?? {}
    const currentAi = currentApps.ai ?? {}
    updateSettings({
      apps: {
        ...currentApps,
        ai: { ...currentAi, selectedSlot: nextSlot },
      },
    })
  }, [updateSettings])

  return { activeSlots, selectedSlot, setSelectedSlot }
}

function GoalInput({ goal, setGoal, busy, onSubmit, onCancel, scope, viewingTab, autoMode, onSetAutoMode, t, size }) {
  const lang = useStore(s => s.lang ?? 'en')
  const { isSupported: micSupported, isListening, start, stop } = useSpeechInput({
    lang,
    onResult: value => setGoal(value),
  })
  const { activeSlots, selectedSlot, setSelectedSlot } = useActiveSlots()

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(buildGoalWithAttachments())
    }
  }

  const currentSlotObj = activeSlots.find(s => s.name === selectedSlot)
  const currentModel = currentSlotObj?.model || currentSlotObj?.name || ''

  const fileInputRef = useRef(null)
  const [attachments, setAttachments] = useState([])

  const handleAttachClick = () => fileInputRef.current?.click()

  const handleFileChange = e => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    files.forEach(file => {
      const isImage = file.type.startsWith('image/')
      const reader = new FileReader()
      if (isImage) {
        reader.onload = ev => setAttachments(prev => [...prev, { name: file.name, kind: 'image', dataUrl: ev.target.result }])
        reader.readAsDataURL(file)
      } else {
        reader.onload = ev => setAttachments(prev => [...prev, { name: file.name, kind: 'text', content: ev.target.result }])
        reader.readAsText(file)
      }
    })
  }

  const removeAttachment = name => setAttachments(prev => prev.filter(a => a.name !== name))

  const buildGoalWithAttachments = () => {
    const trimmed = goal.trim()
    if (!attachments.length) return trimmed
    const blocks = attachments.map(a => {
      if (a.kind === 'image') return `[Attached image: ${a.name}]`
      return `--- ${a.name} ---\n${a.content}\n---`
    })
    return `${blocks.join('\n\n')}\n\n${trimmed}`
  }

  return (
    <div className="w-full space-y-1.5">
      <div className={cn('w-full rounded-2xl border border-border bg-card', size === 'lg' ? 'p-4' : 'p-3')}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="text/*,.md,.txt,.js,.ts,.jsx,.tsx,.py,.json,.csv,.xml,.html,.css,.pdf,image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {(scope || viewingTab || attachments.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            {scope && <ScopeChip scope={scope} t={t} />}
            {viewingTab && <ViewingTabChip viewingTab={viewingTab} t={t} />}
            {attachments.map(a => (
              <span
                key={a.name}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 pl-1 pr-0.5 py-0.5 text-xs text-primary max-w-[160px]"
              >
                {a.kind === 'image'
                  ? <img src={a.dataUrl} alt={a.name} className="h-4 w-4 rounded-full object-cover shrink-0" />
                  : <Paperclip className="h-3 w-3 shrink-0" />}
                <span className="truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.name)}
                  className="p-0.5 rounded-full hover:bg-primary/20 transition-colors shrink-0"
                  aria-label={`Remove ${a.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={busy}
            title={t.aiAttachFile ?? 'Attach file'}
            aria-label={t.aiAttachFile ?? 'Attach file'}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full h-7 w-7 flex items-center justify-center transition-colors shrink-0 disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <AutoGrowTextarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.aiGoalPlaceholder}
              disabled={busy}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {micSupported && (
              <button
                type="button"
                onClick={() => (isListening ? stop() : start())}
                title={isListening ? t.voiceInputStopAria : t.voiceInputAria}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                  isListening ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            {busy ? (
              <button
                type="button"
                onClick={onCancel}
                title={t.aiCancelRun}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-80"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSubmit(buildGoalWithAttachments())}
                disabled={!goal.trim()}
                title={t.aiStartRun}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-1">
        {onSetAutoMode && (
          <button
            type="button"
            onClick={() => onSetAutoMode(!autoMode)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded font-normal capitalize"
          >
            {autoMode ? (t.aiModeAuto ?? 'auto') : (t.aiModeManual ?? 'manual')}
          </button>
        )}
        {activeSlots.length > 0 && (
          <Select value={selectedSlot} onValueChange={setSelectedSlot}>
            <SelectTrigger
              size="sm"
              className="h-6 gap-0 border-none bg-transparent hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent px-1 text-xs font-normal text-muted-foreground shadow-none hover:text-foreground focus:bg-transparent focus:outline-none [&_svg]:hidden"
              aria-label="Model"
            >
              <SelectValue>{currentModel}</SelectValue>
            </SelectTrigger>
            <SelectContent
              side="top"
              sideOffset={6}
              align="end"
              alignItemWithTrigger={false}
              className="[&_[data-slot=select-scroll-down-button]]:!hidden [&_[data-slot=select-scroll-up-button]]:!hidden [&_[data-direction]]:!hidden [&_[data-slot*='scroll']]:!hidden"
            >
              {activeSlots.map(s => (
                <SelectItem key={s.name} value={s.name}>
                  {s.model || s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}

function useGreeting(t) {
  const weatherEnabled = useStore(s => s.settings?.weatherEnabled === true)
  const days = useWeatherForecast()
  const todayCategory = weatherEnabled && days?.[0] ? weatherCategory(days[0].code) : null

  return useMemo(
    () => getSessionGreeting(t, { hour: new Date().getHours(), todayWeatherCategory: todayCategory }),
    [todayCategory, t],
  )
}

export function ConversationPane({
  status,
  run,
  messages,
  scope,
  onStart,
  onCancel,
  onCommit,
  onDiscard,
  onUndo,
  onNewConversation,
  onOpenHistory,
  targetHidden,
  showTarget,
  onShowTarget,
  autoMode = false,
  onSetAutoMode,
  prefillGoal = null,
  viewingTab = null,
  t,
}) {
  const [goal, setGoal] = useState('')
  const busy = status === 'running'
  const awaitingConfirm = status === 'awaitingConfirm'
  const hasMessages = (messages ?? []).length > 0
  const greeting = useGreeting(t)
  const agentJournal = useStore(s => s.agentJournal)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefillGoal) setGoal(prefillGoal)
  }, [prefillGoal])

  const submit = (goalOverride) => {
    const trimmed = (typeof goalOverride === 'string' ? goalOverride : goal).trim()
    if (!trimmed || busy) return
    setGoal('')
    onStart(trimmed)
  }

  if (!hasMessages) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-3 md:px-4 py-2 shrink-0">
          <button
            type="button"
            onClick={onOpenHistory}
            title={t.aiHistory}
            aria-label={t.aiHistory}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col flex-1 min-h-0 items-center justify-center p-4 gap-6 overflow-y-auto">
          <p className="text-xl font-medium text-foreground/90 text-center">{greeting}</p>
          <div className="w-full max-w-2xl mx-auto">
            <GoalInput
              goal={goal}
              setGoal={setGoal}
              busy={busy}
              onSubmit={submit}
              onCancel={onCancel}
              scope={scope}
              viewingTab={viewingTab}
              autoMode={autoMode}
              onSetAutoMode={onSetAutoMode}
              t={t}
              size="lg"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 md:px-4 py-2 shrink-0 gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenHistory}
            title={t.aiHistory}
            aria-label={t.aiHistory}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNewConversation}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.aiNewConversation}
          </button>
        </div>
        {targetHidden && showTarget && onShowTarget && (
          <button
            type="button"
            onClick={onShowTarget}
            title={t.aiShowTarget}
            aria-label={t.aiShowTarget}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3">
        {messages.map(message => {
          const entry = (agentJournal?.entries ?? []).find(e => e.runId === message.runId)
          const canUndo = Boolean(entry && entry.undoable !== false)
          return (
            <MessageBubble
              key={message.id}
              message={message}
              onUndo={onUndo}
              canUndo={canUndo}
              t={t}
            />
          )
        })}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.aiStatusRunning}
          </div>
        )}

        {status === 'failed' && (() => {
          const lastUserMsg = [...(messages ?? [])].reverse().find(m => m.role === 'user')
          return (
            <FailureDetail
              error={run?.error}
              onRetry={lastUserMsg ? () => onStart(lastUserMsg.content) : undefined}
              onDismiss={lastUserMsg?.runId ? () => onUndo?.(lastUserMsg.runId) : undefined}
              t={t}
            />
          )
        })()}

        {awaitingConfirm && run?.runId && (
          <PlanConfirmPaneHost run={run} onCommit={onCommit} onDiscard={onDiscard} t={t} />
        )}
      </div>

      <div className="p-3 md:p-4 shrink-0 max-w-2xl mx-auto w-full">
        <GoalInput
          goal={goal}
          setGoal={setGoal}
          busy={busy}
          onSubmit={submit}
          onCancel={onCancel}
          scope={scope}
          viewingTab={viewingTab}
          autoMode={autoMode}
          onSetAutoMode={onSetAutoMode}
          t={t}
          size="sm"
        />
      </div>
    </div>
  )
}

function PlanConfirmPaneHost({ run, onCommit, onDiscard, t }) {
  const proposedRun = { id: run.runId, ops: run.run?.ops ?? [] }
  return <PlanConfirmPane run={proposedRun} onCommit={onCommit} onDiscard={onDiscard} t={t} />
}
