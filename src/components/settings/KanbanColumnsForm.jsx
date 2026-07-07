import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

const PROTECTED = new Set(['col_todo', 'col_inprogress', 'col_done'])

function ColumnRow({ col, semesterId, onUpdate, onDelete, t }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}>
      <div className="flex items-center gap-2">
        <button className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground touch-none shrink-0"
          {...attributes} {...listeners} title={t.navDrag}>
          <GripVertical className="h-4 w-4" />
        </button>
        <Input className="flex-1 h-8 text-sm" value={col.title}
          onChange={e => onUpdate(semesterId, col.id, e.target.value)} />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(semesterId, col.id)} disabled={PROTECTED.has(col.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function KanbanColumnsForm({ semesterId, columns }) {
  const [newCol, setNewCol] = useState('')
  const addColumn = useStore(s => s.addKanbanColumn)
  const deleteColumn = useStore(s => s.deleteKanbanColumn)
  const updateColumn = useStore(s => s.updateKanbanColumn)
  const reorderColumns = useStore(s => s.reorderKanbanColumns)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const sorted = [...columns].sort((a, b) => a.order - b.order)
  const ids = sorted.map(c => c.id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const handleAdd = () => {
    if (!newCol.trim()) return
    addColumn(semesterId, newCol.trim())
    setNewCol('')
  }

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    reorderColumns(semesterId, arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)))
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sorted.map(col => (
              <ColumnRow key={col.id} col={col} semesterId={semesterId}
                onUpdate={updateColumn} onDelete={deleteColumn} t={t} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2 pt-1">
        <Input className="flex-1 h-8 text-sm" placeholder={t.newColumnName}
          value={newCol} onChange={e => setNewCol(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <Button variant="outline" size="sm" onClick={handleAdd} className="h-8 gap-1">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
