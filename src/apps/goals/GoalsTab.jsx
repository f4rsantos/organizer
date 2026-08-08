import { useState } from 'react'
import { BarChart3, Pencil, Plus, Target, Trash2, Undo2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { cn } from '@/lib/utils'
import { fireConfetti } from '@/lib/confetti'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import {
  currentPeriodKey,
  goalCompletion,
  goalPeriods,
  goalStreak,
  isCheckedIn,
  isRescue,
} from '@/lib/goals'
import { goalMessage } from '@/lib/goalMessages'
import { GoalCheckInButton } from './GoalCheckInButton'
import { cellSizeFor, GOAL_WHEEL_SIZE } from './cellSize'
import { GoalFormDialog } from './GoalFormDialog'
import { GoalNoteDialog } from './GoalNoteDialog'
import { GoalHistory } from './GoalHistory'

export function GoalsTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const goals = useStore(s => s.goals ?? [])
  const addGoal = useStore(s => s.addGoal)
  const updateGoal = useStore(s => s.updateGoal)
  const deleteGoal = useStore(s => s.deleteGoal)
  const checkInGoal = useStore(s => s.checkInGoal)
  const undoGoalCheckIn = useStore(s => s.undoGoalCheckIn)

  const [selectedId, setSelectedId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [celebration, setCelebration] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [justFilled, setJustFilled] = useState(false)

  const goal = goals.find(g => g.id === selectedId) ?? goals[0] ?? null
  const activeId = goal?.id ?? null
  const now = new Date()
  const periodKey = goal ? currentPeriodKey(goal, now) : null
  const restDay = Boolean(goal) && periodKey === null
  const done = goal ? isCheckedIn(goal, periodKey) : false
  const periods = goal ? goalPeriods(goal, now) : []
  const completion = goal ? goalCompletion(goal, now) : null
  const animating = phase !== 'idle'
  const wheelPct = done && (!animating || justFilled) ? 1 : 0

  const commitCheckIn = note => {
    if (!goal || !periodKey) return
    const rescued = isRescue(goal, now)
    checkInGoal(goal.id, periodKey, note)

    const nextGoal = { ...goal, checkIns: { ...(goal.checkIns ?? {}), [periodKey]: { at: 0, note } } }
    const next = goalStreak(nextGoal, now)
    setCelebration({
      goalId: goal.id,
      message: goalMessage({
        t,
        tone: goal.tone ?? 'warm',
        customMessage: goal.customMessage,
        streak: next.current,
        total: next.total,
        rescued,
        seed: next.total,
      }),
    })

    setPhase('filling')
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setJustFilled(true)
        void fireConfetti()
      })
    })
    window.setTimeout(() => setPhase('flying'), 1500)
    window.setTimeout(() => {
      setPhase('idle')
      setShowHistory(true)
    }, 2300)
  }

  const handleCheckIn = () => {
    if (!goal || done || restDay) return
    if (goal.requireNote) { setNoteOpen(true); return }
    commitCheckIn('')
  }

  const handleUndo = () => {
    if (!goal || !periodKey) return
    undoGoalCheckIn(goal.id, periodKey)
    setCelebration(null)
    setJustFilled(false)
    setPhase('idle')
    setShowHistory(false)
  }

  const handleSubmit = data => {
    if (editingGoal) {
      updateGoal(editingGoal.id, data)
      return
    }
    addGoal(data)
  }

  const openAdd = () => { setEditingGoal(null); setFormOpen(true) }
  const openEdit = () => { setEditingGoal(goal); setFormOpen(true) }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t.goals}</h2>
          {goal && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon"
                className={cn('h-7 w-7 text-muted-foreground', showHistory && 'bg-secondary text-foreground')}
                onClick={() => setShowHistory(v => !v)} title={t.goalSeeProgress}>
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                onClick={openEdit} title={t.goalEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                onClick={handleUndo} disabled={!done || restDay} title={t.goalUndoToday}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)} title={t.goalDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {goals.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => { setSelectedId(g.id); setShowHistory(false); setJustFilled(false); setPhase('idle') }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                g.id === activeId
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {g.title}
            </button>
          ))}
          <button
            type="button"
            onClick={openAdd}
            className="rounded-full border border-dashed border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            {t.goalAdd}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-4">
        {!goal ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <Target className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t.goalsEmpty}</p>
            <Button size="sm" onClick={openAdd}>{t.goalAdd}</Button>
          </div>
        ) : showHistory ? (
          <GoalHistory goal={goal} periods={periods} completion={completion}
            message={done && celebration?.goalId === goal.id ? celebration.message : ''} t={t} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 pb-6">
            <div
              className={cn('transition-all ease-in-out', phase === 'flying' ? 'duration-700 opacity-0' : 'duration-300')}
              style={phase === 'flying'
                ? { transform: `translateY(-6rem) scale(${cellSizeFor(periods.length) / GOAL_WHEEL_SIZE})` }
                : undefined}
            >
              <GoalCheckInButton
                done={done}
                restDay={restDay}
                pct={wheelPct}
                label={restDay ? t.goalRestDay : t.goalClickPrompt}
                onClick={handleCheckIn}
              />
            </div>
            {done && phase !== 'flying' && celebration?.goalId === goal.id && celebration.message && (
              <p className="text-sm font-medium text-center">{celebration.message}</p>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <GoalFormDialog key={editingGoal?.id ?? 'new'} open onOpenChange={setFormOpen}
          goal={editingGoal} onSubmit={handleSubmit} t={t} />
      )}
      {noteOpen && (
        <GoalNoteDialog open onOpenChange={setNoteOpen} onSubmit={commitCheckIn} t={t} />
      )}
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete}
        title={t.goalDeleteTitle} description={t.goalDeleteDesc}
        onConfirm={() => goal && deleteGoal(goal.id)} />
    </div>
  )
}
