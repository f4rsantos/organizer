import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { fireConfetti } from '@/lib/confetti'
import { cn, sortByOrder } from '@/lib/utils'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { useCollabActions } from '@/hooks/useCollabActions'
import { computeCardGroups } from '@/lib/kanbanGrouping'

export function KanbanBoard({ semId, board, localBoard, vertical = false }) {
  const [activeCard, setActiveCard] = useState(null)
  const moveCard = useStore(s => s.moveKanbanCard)
  const { moveSharedCard } = useCollabActions()
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const separateByTeam = useStore(s => s.settings?.kanbanSeparateByTeam ?? true)
  const separateByClass = useStore(s => s.settings?.kanbanSeparateByClass ?? false)
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const personalLabel = t.collabPersonal ?? 'Personal'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const columns = sortByOrder(board?.columns ?? [])
  const doneColumnId = columns[columns.length - 1]?.id ?? null
  const activeColIndex = activeCard ? columns.findIndex(c => c.id === activeCard.columnId) : -1
  const activePrevColId = activeColIndex > 0 ? (columns[activeColIndex - 1]?.id ?? null) : null
  const activeNextColId = activeColIndex >= 0 ? (columns[activeColIndex + 1]?.id ?? null) : null

  const boardGroups = useMemo(
    () => computeCardGroups(board?.cards ?? [], separateByTeam, separateByClass, runtimeTeams, personalLabel),
    [board, separateByTeam, separateByClass, runtimeTeams, personalLabel],
  )
  const isBanded = boardGroups.length > 1

  const onDragStart = ({ active }) => {
    const card = (board?.cards ?? []).find(c => c.id === active.id)
    setActiveCard(card ?? null)
  }

  const onDragEnd = ({ active, over }) => {
    setActiveCard(null)
    if (!over) return
    const targetColId = (board?.columns ?? []).find(col => col.id === over.id)?.id
      ?? (board?.cards ?? []).find(c => c.id === over.id)?.columnId
    if (targetColId && targetColId !== activeCard?.columnId) {
      if (targetColId === doneColumnId) fireConfetti()
      if (activeCard?.sharedMeta?.remote) {
        moveSharedCard({
          teamId: activeCard.sharedMeta.teamId,
          sharedCardId: activeCard.sharedMeta.sharedCardId,
          targetColumnId: targetColId,
        })
        return
      }
      moveCard(semId, active.id, targetColId)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div
        data-kanban-banded={!vertical && isBanded ? 'true' : undefined}
        className={cn(
          vertical ? 'flex flex-col gap-4 w-full pb-2' : 'flex flex-col md:flex-row gap-4 md:items-start w-full pb-2',
          !vertical && (isBanded
            ? 'md:grid md:h-full md:w-full md:gap-y-0 md:gap-x-4 md:[grid-template-columns:repeat(var(--col-count),minmax(14rem,1fr))] md:[grid-template-rows:auto_repeat(var(--band-count),min-content)_1fr]'
            : 'md:h-full'),
        )}
        style={!vertical && isBanded ? { '--col-count': columns.length, '--band-count': boardGroups.length * 2 } : undefined}>
        {columns.map((col, index) => (
          <KanbanColumn key={col.id} col={col} semId={semId}
            localBoard={localBoard}
            doneColumnId={doneColumnId}
            boardGroups={!vertical ? boardGroups : null}
            prevColumnId={index > 0 ? (columns[index - 1]?.id ?? null) : null}
            nextColumnId={columns[index + 1]?.id ?? null}
            cards={sortByOrder((board.cards ?? []).filter(c => c.columnId === col.id))} />
        ))}
      </div>
      <DragOverlay>
        {activeCard && (
          <div className="rotate-2 shadow-2xl">
            <KanbanCard
              card={activeCard}
              semId={semId}
              prevColumnId={activePrevColId}
              nextColumnId={activeNextColId}
              doneColumnId={doneColumnId}
              localBoard={localBoard}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
