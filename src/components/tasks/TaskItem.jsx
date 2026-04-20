import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleCheck, Kanban, Menu, Pencil, Share2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { useStrings } from '@/lib/strings'
import { computeWeekCount } from '@/lib/semesterUtils'
import { TaskForm } from './TaskForm'
import { useCollabActions } from '@/hooks/useCollabActions'

const PRIORITY_COLORS = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-emerald-500' }
const FREE_BOARD_ID = '__free__'

export function TaskItem({ task }) {
  const [editOpen, setEditOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareTeamId, setShareTeamId] = useState('')
  const menuRef = useRef(null)
  const toggleTask = useStore(s => s.toggleTask)
  const deleteTask = useStore(s => s.deleteTask)
  const updateTask = useStore(s => s.updateTask)
  const addKanbanCard = useStore(s => s.addKanbanCard)
  const allBoards = useStore(s => s.kanban)
  const userId = useStore(s => s.collab?.userId)
  const semesters = useStore(s => s.semesters)
  const allClasses = useStore(s => s.classes)
  const {
    teams,
    getTeamName,
    shareTaskToTeam,
    updateSharedTask,
    toggleSharedTask,
    deleteSharedTask,
    addSharedTaskToKanbanForTeam,
  } = useCollabActions()
  const boardId = task.semesterId ?? FREE_BOARD_ID
  const board = allBoards[boardId]
  const classes = useMemo(
    () => allClasses.filter(c => c.semesterId === task.semesterId),
    [allClasses, task.semesterId],
  )
  const semester = useMemo(
    () => semesters.find(s => s.id === task.semesterId) ?? null,
    [semesters, task.semesterId],
  )
  const weekCount = useMemo(
    () => (semester?.startDate && semester?.endDate ? computeWeekCount(semester.startDate, semester.endDate) : 1),
    [semester],
  )
  const isSharedRemote = !!task?.sharedMeta?.remote
  const sharedTeamId = task?.sharedMeta?.teamId
  const sharedTaskId = task?.sharedMeta?.sharedTaskId
  const isSharedLocal = !!task?.sharedRef?.teamId
  const isShared = isSharedRemote || isSharedLocal
  const taskTeamName = useMemo(() => {
    const teamId = task?.sharedMeta?.teamId ?? task?.sharedRef?.teamId
    return teamId ? getTeamName(teamId) : null
  }, [task?.sharedMeta?.teamId, task?.sharedRef?.teamId, getTeamName])
  const isDoneShared = isSharedRemote
    ? !!task.doneForAll || !!task?.doneBy?.[userId]
    : !!task.done

  const resolveKanbanTargetColumnId = () => {
    const columns = [...(board?.columns ?? [])].sort((a, b) => a.order - b.order)
    if (!columns.length) return 'col_todo'
    const todo = columns.find(col => col.id.toLowerCase().includes('todo') || col.title.toLowerCase().includes('to do') || col.title.toLowerCase().includes('todo'))
    return todo?.id ?? columns[0]?.id ?? 'col_todo'
  }

  const todoColumnId = useMemo(() => resolveKanbanTargetColumnId(), [board])

  const todoOrder = useMemo(
    () => (board?.cards ?? []).filter(c => c.columnId === todoColumnId).length,
    [board, todoColumnId],
  )
  const alreadyInKanban = useMemo(
    () => {
      if (isSharedRemote) {
        return (board?.cards ?? []).some(c => c.sharedTaskId === sharedTaskId)
      }
      return (board?.cards ?? []).some(c => c.sourceTaskId === task.id)
    },
    [board, isSharedRemote, sharedTaskId, task.id],
  )
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  useEffect(() => {
    if (!menuOpen) return
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const addToKanban = () => {
    if (alreadyInKanban) return
    if (isSharedRemote) {
      addSharedTaskToKanbanForTeam({
        teamId: sharedTeamId,
        sharedTaskId,
        semId: boardId,
        columnId: todoColumnId,
      })
      return
    }
    addKanbanCard(boardId, {
      columnId: todoColumnId,
      sourceTaskId: task.id,
      title: task.title,
      priority: task.priority ?? null,
      dueDate: task.dueDate ?? null,
      order: todoOrder,
      checklist: [],
    })
  }

  const toggleDone = async () => {
    if (isSharedRemote) {
      await toggleSharedTask({ teamId: sharedTeamId, sharedTaskId })
      return
    }
    toggleTask(task.id)
  }

  const handleEditSubmit = async data => {
    if (isSharedRemote) {
      await updateSharedTask({ teamId: sharedTeamId, sharedTaskId, patch: data })
      return
    }
    updateTask(task.id, data)
  }

  const handleDelete = async () => {
    if (isSharedRemote) {
      await deleteSharedTask({ teamId: sharedTeamId, sharedTaskId })
      return
    }
    deleteTask(task.id)
  }

  const handleShare = async () => {
    if (!shareTeamId) return
    await shareTaskToTeam({
      task,
      teamId: shareTeamId,
      localBoard: board,
    })
    setShareOpen(false)
    setShareTeamId('')
  }

  const openShare = async () => {
    if (!teams.length) return
    if (teams.length === 1) {
      await shareTaskToTeam({
        task,
        teamId: teams[0].teamId,
        localBoard: board,
      })
      return
    }
    setShareOpen(true)
  }

  return (
    <>
      <div className={cn('flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-secondary/40 group', isDoneShared && 'opacity-60')}>
        <button onClick={toggleDone} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
          {isDoneShared
            ? <CircleCheck className="h-5 w-5 text-primary" />
            : <Circle className="h-5 w-5" />
          }
        </button>
        <div className="flex-1 min-w-0">
          <span className={cn('text-sm leading-snug', isDoneShared && 'line-through text-muted-foreground')}>
            {task.title}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {task.priority && (
              <span className={cn('inline-block h-2 w-2 rounded-full mt-1 shrink-0', PRIORITY_COLORS[task.priority])} />
            )}
            {task.dueDate && (
              <Badge variant="secondary" className="text-xs h-5">{task.dueDate}</Badge>
            )}
            {task.weekStart !== task.weekEnd && (
              <Badge variant="outline" className="text-xs h-5">W{task.weekStart}–W{task.weekEnd}</Badge>
            )}
            {isShared && (
              <Badge variant="outline" className="text-xs h-5">{taskTeamName ?? 'shared'}</Badge>
            )}
          </div>
        </div>

        {/* Mobile: hamburger menu */}
        <div ref={menuRef} className="md:hidden flex items-center gap-1 shrink-0">
          {menuOpen ? (
            <>
              {!alreadyInKanban && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title={t.addToKanban}
                  onClick={() => { addToKanban(); setMenuOpen(false) }}>
                  <Kanban className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => { setEditOpen(true); setMenuOpen(false) }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {!isShared && teams.length > 0 && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => { openShare(); setMenuOpen(false) }}>
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => { handleDelete(); setMenuOpen(false) }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setMenuOpen(true)}>
              <Menu className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Desktop: hover-reveal buttons */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {!alreadyInKanban && (
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              title={t.addToKanban}
              onClick={addToKanban}>
              <Kanban className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
            onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!isShared && teams.length > 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={openShare}>
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.editTask}</DialogTitle>
          </DialogHeader>
          {editOpen && (
            <TaskForm
              semesterId={task.semesterId}
              classes={classes}
              weekCount={weekCount}
              defaultWeek={task.weekStart ?? 1}
              startDate={semester?.startDate ?? null}
              initialData={task}
              submitLabel={t.save}
              onSubmitTask={handleEditSubmit}
              onDone={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={shareTeamId} onValueChange={setShareTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.teamId} value={team.teamId}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end">
              <Button disabled={!shareTeamId} onClick={handleShare}>{t.confirm}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
