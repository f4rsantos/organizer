import { useEffect } from 'react'
import { PanelRightClose } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { KanbanTab } from '@/components/kanban/KanbanTab'
import { TasksTab } from '@/components/tasks/TasksTab'
import { NotesTab } from '@/components/notes/NotesTab'
import { CalendarTab } from '@/components/calendar/CalendarTab'
import { GradesTab } from '@/components/grades/GradesTab'
import { FocusTab } from '@/components/focus/FocusTab'

function targetNoteId(scope, ops) {
  const noteOp = [...ops].reverse().find(op => op.entityType === 'note')
  if (noteOp) return noteOp.targetId ?? noteOp.id ?? null
  if (scope?.type === 'note' && typeof scope.noteId === 'string') return scope.noteId
  return null
}

const VIEWING_TAB_COMPONENTS = {
  tasks: TasksTab,
  kanban: KanbanTab,
  notes: NotesTab,
  calendar: CalendarTab,
  grades: GradesTab,
  focus: FocusTab,
}

export function TargetPane({ scope, run, viewingTab, viewingNoteId, onHide, t }) {
  const store = useStore.getState()
  const activeRunId = useStore(s => s.agentRuntime?.activeRunId)
  const setRequestedNote = useStore(s => s.setRequestedNote)
  const effectiveOps = run?.ops ?? run?.run?.ops ?? (activeRunId ? store.agentRuntime?.runs?.[activeRunId]?.ops : null) ?? []

  const isKanban = scope?.type === 'kanban' || effectiveOps.some(op => op.entityType === 'kanbanCard' || op.patch?.columnId !== undefined || op.entity?.columnId !== undefined)
  const isTask = !isKanban && (scope?.type === 'task' || effectiveOps.some(op => op.entityType === 'task'))
  const isNote = !isKanban && !isTask && (scope?.type === 'note' || scope?.type === 'folder' || effectiveOps.some(op => op.entityType === 'note'))
  const isCalendar = !isKanban && !isTask && !isNote && (scope?.type === 'event' || effectiveOps.some(op => op.entityType === 'event'))

  const ViewingTabComponent = VIEWING_TAB_COMPONENTS[viewingTab] ?? null

  const noteId = ViewingTabComponent
    ? (viewingTab === 'notes' ? viewingNoteId : null)
    : (isNote ? targetNoteId(scope, effectiveOps) : null)

  useEffect(() => {
    if (noteId) setRequestedNote(noteId)
  }, [noteId, setRequestedNote])

  return (
    <div className="h-full flex flex-col min-h-0 relative">
      {onHide && (
        <button
          type="button"
          onClick={onHide}
          title={t.aiHideTarget ?? 'Hide'}
          aria-label={t.aiHideTarget ?? 'Hide'}
          className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-card/90 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border shadow-xs backdrop-blur-sm transition-colors"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        {ViewingTabComponent ? (
          <ViewingTabComponent />
        ) : isKanban ? (
          <KanbanTab />
        ) : isTask ? (
          <TasksTab />
        ) : isNote ? (
          <NotesTab />
        ) : isCalendar ? (
          <CalendarTab />
        ) : (
          <KanbanTab />
        )}
      </div>
    </div>
  )
}
