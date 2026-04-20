import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { useCollabActions } from '@/hooks/useCollabActions'

export function KanbanBoard({ semId, board, localBoard }) {
  const [activeCard, setActiveCard] = useState(null)
  const moveCard = useStore(s => s.moveKanbanCard)
  const { moveSharedCard } = useCollabActions()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const columns = [...(board?.columns ?? [])].sort((a, b) => a.order - b.order)
  const activeColIndex = activeCard ? columns.findIndex(c => c.id === activeCard.columnId) : -1
  const activePrevColId = activeColIndex > 0 ? (columns[activeColIndex - 1]?.id ?? null) : null
  const activeNextColId = activeColIndex >= 0 ? (columns[activeColIndex + 1]?.id ?? null) : null

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
      <div className="flex gap-4 h-full pb-2 items-start">
        {columns.map((col, index) => (
          <KanbanColumn key={col.id} col={col} semId={semId}
            localBoard={localBoard}
            prevColumnId={index > 0 ? (columns[index - 1]?.id ?? null) : null}
            nextColumnId={columns[index + 1]?.id ?? null}
            cards={(board.cards ?? []).filter(c => c.columnId === col.id).sort((a, b) => a.order - b.order)} />
        ))}
      </div>
      <DragOverlay>
        {activeCard && (
          <KanbanCard
            card={activeCard}
            semId={semId}
            prevColumnId={activePrevColId}
            nextColumnId={activeNextColId}
            localBoard={localBoard}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
