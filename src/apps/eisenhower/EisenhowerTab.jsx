import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, useDroppable, useDraggable } from '@dnd-kit/core'
import { Circle, CircleCheck, Menu, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useMergedTasks } from '@/hooks/useMergedTasks'
import { useWeekContext } from '@/hooks/useWeekContext'
import { useCollabActions } from '@/hooks/useCollabActions'
import { TaskForm } from '@/components/tasks/TaskForm'
import { EISENHOWER_DISMISSED } from '@/lib/taskUtils'
import { fireConfetti } from '@/lib/confetti'
import { cn } from '@/lib/utils'

const PRIORITY_DOT = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
}

const DEFAULT_QUADRANTS = [
  { id: 'urgent-important', urgent: true, important: true, labelKey: 'eisenhowerDoNow', tint: 'bg-muted/60 border-border', dotColor: 'bg-foreground/70' },
  { id: 'important', urgent: false, important: true, labelKey: 'eisenhowerSchedule', tint: 'bg-muted/40 border-border', dotColor: 'bg-foreground/50' },
  { id: 'urgent', urgent: true, important: false, labelKey: 'eisenhowerDelegate', tint: 'bg-muted/40 border-border', dotColor: 'bg-foreground/50' },
  { id: 'neither', urgent: false, important: false, labelKey: 'eisenhowerEliminate', tint: 'bg-muted/20 border-border', dotColor: 'bg-foreground/30' },
]
const UNSORTED_ID = 'unsorted'
const PAST_DAYS_CUTOFF = 7
const EMPTY_ARR = []
const EMPTY_OBJ = {}

function quadrantOf(task) {
  if (!task.eisenhower) return UNSORTED_ID
  const { urgent, important } = task.eisenhower
  return DEFAULT_QUADRANTS.find(q => q.urgent === !!urgent && q.important === !!important)?.id ?? UNSORTED_ID
}

function isPastTask(task) {
  if (!task.dueDate) return false
  const due = new Date(task.dueDate)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PAST_DAYS_CUTOFF)
  return due < cutoff
}

function EisenhowerCard({ task, classColor, className: cls, onEdit, onDelete, onToggleDone }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const interactive = !!(onEdit || onDelete)
  const userId = useStore(s => s.collab?.userId)
  const isDone = task?.sharedMeta?.remote
    ? !!task.doneForAll || !!task?.doneBy?.[userId]
    : !!task.done

  useEffect(() => {
    if (!menuOpen) return
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [menuOpen])

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={cn(
        'relative flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-xs select-none cursor-grab touch-none active:cursor-grabbing',
        'transition-shadow hover:shadow-md min-w-[140px] max-w-[200px]',
        isDragging && 'opacity-40 ring-2 ring-primary',
        isDone && 'opacity-60',
        cls,
      )}>
      <div className="flex items-start gap-2">
        {onToggleDone && (
          <button type="button"
            className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
            onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}
            onClick={onToggleDone}>
            {isDone ? <CircleCheck className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4" />}
          </button>
        )}
        {task.priority && (
          <span className={cn('h-2 w-2 rounded-full shrink-0 mt-1', PRIORITY_DOT[task.priority])} />
        )}
        {classColor && <span className="h-2 w-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: classColor }} />}
        <span className={cn('flex-1 font-medium leading-tight line-clamp-2', isDone && 'line-through text-muted-foreground')}>
          {task.title || 'Untitled'}
        </span>
        {interactive && (
          <div ref={menuRef} className="shrink-0" onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            {menuOpen ? (
              <div className="flex items-center gap-0.5">
                {onEdit && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => { onEdit(); setMenuOpen(false) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => { onDelete(); setMenuOpen(false) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setMenuOpen(true)}>
                <Menu className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
      {task.dueDate && (
        <Badge variant="secondary" className="text-[10px] self-start px-1.5 font-medium mt-1">
          {task.dueDate}
        </Badge>
      )}
    </div>
  )
}

function Quadrant({ quadrant, tasks, classById, t, customLabel, onAddTask, onEditTask, onDeleteTask, onToggleDone }) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant.id })
  const label = customLabel || t[quadrant.labelKey]
  const isCustom = quadrant.tint?.startsWith('#')
  const style = isCustom ? { backgroundColor: quadrant.tint + '1a', borderColor: quadrant.tint + '4d' } : {}
  const dotStyle = isCustom ? { backgroundColor: quadrant.dotColor } : {}

  return (
    <div ref={setNodeRef}
      style={style}
      className={cn('flex flex-col rounded-xl border p-3 transition-colors overflow-hidden', !isCustom && quadrant.tint, isOver && 'ring-2 ring-primary/40')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', !isCustom && quadrant.dotColor)} style={dotStyle} />
          <p className="text-sm font-semibold text-foreground/90 tracking-tight">{label}</p>
          {tasks.length > 0 && <span className="text-[10px] text-muted-foreground/60">({tasks.length})</span>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-primary/10" onClick={onAddTask}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2 items-start">
          {tasks.map(task => (
            <EisenhowerCard key={task.id} task={task} classColor={classById[task.classId]?.color}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              onToggleDone={() => onToggleDone(task)} />
          ))}
        </div>
        {tasks.length === 0 && <p className="text-xs text-muted-foreground/40 py-6 text-center">{t.eisenhowerEmpty}</p>}
      </div>
    </div>
  )
}

function UnsortedTray({ tasks, classById, t, onEditTask, onDeleteTask, onToggleDone }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSORTED_ID })
  return (
    <div ref={setNodeRef}
      className={cn('flex flex-col rounded-xl border border-border bg-secondary/30 p-3 min-h-48 transition-colors', isOver && 'ring-2 ring-primary/40')}>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-muted-foreground">{t.eisenhowerUnsorted}</p>
        {tasks.length > 0 && <span className="text-[10px] text-muted-foreground/60">({tasks.length})</span>}
      </div>
      <div className={cn('flex-1', tasks.length > 0 && 'overflow-y-auto')}>
        <div className="flex flex-wrap gap-1.5">
          {tasks.map(task => (
            <EisenhowerCard key={task.id} task={task} classColor={classById[task.classId]?.color} className="flex-shrink-0"
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              onToggleDone={() => onToggleDone(task)} />
          ))}
        </div>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">{t.eisenhowerUnsortedEmpty}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function EisenhowerTab() {
  const [activeTask, setActiveTask] = useState(null)
  const [addingQuadrant, setAddingQuadrant] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const activeSemesterId = useStore(s => s.activeSemesterId)
  const allClasses = useStore(s => s.classes) || EMPTY_ARR
  const setTaskEisenhower = useStore(s => s.setTaskEisenhower)
  const updateTask = useStore(s => s.updateTask)
  const deleteTask = useStore(s => s.deleteTask)
  const toggleTask = useStore(s => s.toggleTask)
  const toggleRecurringOccurrence = useStore(s => s.toggleRecurringOccurrence)
  const clearEisenhowerDone = useStore(s => s.clearEisenhowerDone)
  const { toggleSharedTask } = useCollabActions()
  const [confirmClear, setConfirmClear] = useState(false)
  const customQuadrants = useStore(s => s.settings?.apps?.eisenhowerQuadrants) || EMPTY_OBJ
  const userId = useStore(s => s.collab?.userId)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const tasks = useMergedTasks(activeSemesterId)
  const { semester, mode, currentWeek, weekCount, weekDateRange, dateToWeek } = useWeekContext()
  const noneMode = mode === 'none'
  const scopeId = noneMode ? null : (semester?.id ?? null)
  const classes = allClasses.filter(c => c.semesterId === scopeId)

  const classById = useMemo(() => allClasses.reduce((acc, cls) => {
    acc[cls.id] = cls
    return acc
  }, {}), [allClasses])

  const visibleTasks = useMemo(
    () => tasks.filter(task => task.eisenhower !== EISENHOWER_DISMISSED && !isPastTask(task)),
    [tasks],
  )
  const hasDoneTasks = useMemo(() => visibleTasks.some(task => task.done), [visibleTasks])

  const handleToggleDone = async task => {
    const isDone = task?.sharedMeta?.remote
      ? !!task.doneForAll || !!task?.doneBy?.[userId]
      : !!task.done
    if (!isDone) fireConfetti()
    if (task?.sharedMeta?.remote) {
      await toggleSharedTask({ teamId: task.sharedMeta.teamId, sharedTaskId: task.sharedMeta.sharedTaskId })
      return
    }
    if (task.isRecurringOccurrence) {
      toggleRecurringOccurrence(task.templateId, task.occurrenceDate)
      return
    }
    toggleTask(task.id)
  }

  const grouped = useMemo(() => {
    const map = { [UNSORTED_ID]: [], ...Object.fromEntries(DEFAULT_QUADRANTS.map(q => [q.id, []])) }
    for (const task of visibleTasks) map[quadrantOf(task)].push(task)
    return map
  }, [visibleTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const onDragStart = ({ active }) => {
    setActiveTask(visibleTasks.find(task => task.id === active.id) ?? null)
  }

  const onDragEnd = ({ active, over }) => {
    setActiveTask(null)
    if (!over) return
    const targetId = over.id
    if (targetId === UNSORTED_ID) {
      setTaskEisenhower(active.id, null)
      return
    }
    const quadrant = DEFAULT_QUADRANTS.find(q => q.id === targetId)
    if (!quadrant) return
    setTaskEisenhower(active.id, { urgent: quadrant.urgent, important: quadrant.important })
  }

  const handleAddTaskDone = () => {
    setAddingQuadrant(null)
  }

  const handleEditSubmit = data => {
    if (!editingTask) return
    updateTask(editingTask.id, data)
    setEditingTask(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 shrink-0 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t.eisenhower}</h2>
        <Button variant="outline" size="sm" disabled={!hasDoneTasks} onClick={() => setConfirmClear(true)}>
          {t.eisenhowerCleanDone}
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 px-4 md:px-6 min-h-0 overflow-hidden">
          {DEFAULT_QUADRANTS.map(quadrant => {
            const custom = customQuadrants[quadrant.id]
            const mergedQuadrant = custom?.tint
              ? { ...quadrant, tint: custom.tint, dotColor: custom.dotColor ?? custom.tint }
              : quadrant
            return (
              <Quadrant key={quadrant.id} quadrant={mergedQuadrant} tasks={grouped[quadrant.id]} classById={classById} t={t}
                customLabel={custom?.name}
                onAddTask={() => setAddingQuadrant(quadrant)}
                onEditTask={setEditingTask}
                onDeleteTask={deleteTask}
                onToggleDone={handleToggleDone} />
            )
          })}
        </div>
        <div className="px-4 md:px-6 py-3 shrink-0">
          <UnsortedTray tasks={grouped[UNSORTED_ID]} classById={classById} t={t}
            onEditTask={setEditingTask}
            onDeleteTask={deleteTask}
            onToggleDone={handleToggleDone} />
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 shadow-2xl">
              <EisenhowerCard task={activeTask} classColor={classById[activeTask.classId]?.color} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog open={confirmClear} onOpenChange={setConfirmClear}
        title={t.eisenhowerCleanDoneTitle} description={t.eisenhowerCleanDoneDesc}
        onConfirm={clearEisenhowerDone} />

      <Dialog open={!!addingQuadrant} onOpenChange={v => !v && setAddingQuadrant(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.eisenhowerAddTask}</DialogTitle>
          </DialogHeader>
          {addingQuadrant && (
            <TaskForm
              semesterId={scopeId}
              classes={classes}
              weekCount={weekCount}
              defaultWeek={currentWeek}
              startDate={semester?.startDate}
              rangeFor={noneMode ? weekDateRange : null}
              dateToWeekFn={noneMode ? dateToWeek : null}
              defaultEisenhower={{ urgent: addingQuadrant.urgent, important: addingQuadrant.important }}
              onDone={() => handleAddTaskDone(addingQuadrant)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={v => !v && setEditingTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.editTask}</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              semesterId={scopeId}
              classes={classes}
              weekCount={weekCount}
              defaultWeek={editingTask.weekStart ?? currentWeek}
              startDate={semester?.startDate}
              rangeFor={noneMode ? weekDateRange : null}
              dateToWeekFn={noneMode ? dateToWeek : null}
              initialData={editingTask}
              submitLabel={t.save}
              onSubmitTask={handleEditSubmit}
              onDone={() => setEditingTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
