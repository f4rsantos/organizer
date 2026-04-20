import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'

export function KanbanColumnsForm({ semesterId, columns }) {
  const [newCol, setNewCol] = useState('')
  const addColumn = useStore(s => s.addKanbanColumn)
  const deleteColumn = useStore(s => s.deleteKanbanColumn)
  const updateColumn = useStore(s => s.updateKanbanColumn)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const handleAdd = () => {
    if (!newCol.trim()) return
    addColumn(semesterId, newCol.trim())
    setNewCol('')
  }

  const sorted = [...columns].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-2">
      {sorted.map(col => (
        <div key={col.id} className="flex items-center gap-2">
          <Input className="flex-1 h-8 text-sm" value={col.title}
            onChange={e => updateColumn(semesterId, col.id, e.target.value)} />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => deleteColumn(semesterId, col.id)} disabled={columns.length <= 1}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
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
