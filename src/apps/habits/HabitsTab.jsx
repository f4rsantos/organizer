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
  habitCompletion,
  habitPeriods,
  habitStreak,
  isCheckedIn,
  isRescue,
} from '@/lib/habits'
import { habitMessage, messageSeed } from '@/lib/habitMessages'
import { HabitCheckInButton } from './HabitCheckInButton'
import { cellSizeFor, HABIT_WHEEL_SIZE } from './cellSize'
import { HabitFormDialog } from './HabitFormDialog'
import { HabitNoteDialog } from './HabitNoteDialog'
import { HabitHistory } from './HabitHistory'

export function HabitsTab() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const habits = useStore(s => s.habits ?? [])
  const addHabit = useStore(s => s.addHabit)
  const updateHabit = useStore(s => s.updateHabit)
  const deleteHabit = useStore(s => s.deleteHabit)
  const checkInHabit = useStore(s => s.checkInHabit)
  const undoHabitCheckIn = useStore(s => s.undoHabitCheckIn)

  const [selectedId, setSelectedId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [justFilled, setJustFilled] = useState(false)

  const habit = habits.find(g => g.id === selectedId) ?? habits[0] ?? null
  const activeId = habit?.id ?? null
  const now = new Date()
  const periodKey = habit ? currentPeriodKey(habit, now) : null
  const restDay = Boolean(habit) && periodKey === null
  const done = habit ? isCheckedIn(habit, periodKey) : false
  const periods = habit ? habitPeriods(habit, now) : []
  const completion = habit ? habitCompletion(habit, now) : null
  const animating = phase !== 'idle'
  const wheelPct = done && (!animating || justFilled) ? 1 : 0

  const celebrationMessage = (() => {
    if (!habit || !done) return ''
    const streak = habitStreak(habit, now)
    return habitMessage({
      t,
      tone: habit.tone ?? 'warm',
      customMessage: habit.customMessage,
      streak: streak.current,
      total: streak.total,
      rescued: isRescue(habit, now),
      seed: messageSeed(habit.id, periodKey),
    })
  })()

  const commitCheckIn = note => {
    if (!habit || !periodKey) return
    checkInHabit(habit.id, periodKey, note)

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
    if (!habit || done || restDay) return
    if (habit.requireNote) { setNoteOpen(true); return }
    commitCheckIn('')
  }

  const handleUndo = () => {
    if (!habit || !periodKey) return
    undoHabitCheckIn(habit.id, periodKey)
    setJustFilled(false)
    setPhase('idle')
    setShowHistory(false)
  }

  const handleSubmit = data => {
    if (editingHabit) {
      updateHabit(editingHabit.id, data)
      return
    }
    addHabit(data)
  }

  const openAdd = () => { setEditingHabit(null); setFormOpen(true) }
  const openEdit = () => { setEditingHabit(habit); setFormOpen(true) }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t.habits}</h2>
          {habit && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon"
                className={cn('h-7 w-7 text-muted-foreground', showHistory && 'bg-secondary text-foreground')}
                onClick={() => setShowHistory(v => !v)} title={t.habitSeeProgress}>
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                onClick={openEdit} title={t.habitEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                onClick={handleUndo} disabled={!done || restDay} title={t.habitUndoToday}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(true)} title={t.habitDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {habits.map(g => (
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
            {t.habitAdd}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-4">
        {!habit ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <Target className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t.habitsEmpty}</p>
            <Button size="sm" onClick={openAdd}>{t.habitAdd}</Button>
          </div>
        ) : showHistory ? (
          <HabitHistory habit={habit} periods={periods} completion={completion}
            message={celebrationMessage} t={t} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 pb-6">
            <div
              className={cn('transition-all ease-in-out', phase === 'flying' ? 'duration-700 opacity-0' : 'duration-300')}
              style={phase === 'flying'
                ? { transform: `translateY(-6rem) scale(${cellSizeFor(periods.length) / HABIT_WHEEL_SIZE})` }
                : undefined}
            >
              <HabitCheckInButton
                done={done}
                restDay={restDay}
                pct={wheelPct}
                label={restDay ? t.habitRestDay : t.habitClickPrompt}
                onClick={handleCheckIn}
              />
            </div>
            {phase !== 'flying' && celebrationMessage && (
              <p className="text-sm font-medium text-center">{celebrationMessage}</p>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <HabitFormDialog key={editingHabit?.id ?? 'new'} open onOpenChange={setFormOpen}
          habit={editingHabit} onSubmit={handleSubmit} t={t} />
      )}
      {noteOpen && (
        <HabitNoteDialog open onOpenChange={setNoteOpen} onSubmit={commitCheckIn} t={t} />
      )}
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete}
        title={t.habitDeleteTitle} description={t.habitDeleteDesc}
        onConfirm={() => habit && deleteHabit(habit.id)} />
    </div>
  )
}
