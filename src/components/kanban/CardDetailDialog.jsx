import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { nanoid } from '@/lib/ids'
import { ChecklistItem } from './ChecklistItem'

const PRIORITIES = [{ value: '', label: 'No priority' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]

export function CardDetailDialog({ open, onOpenChange, card, semId, onSave }) {
  const [local, setLocal] = useState(card)
  const updateCard = useStore(s => s.updateKanbanCard)

  useEffect(() => { if (card) setLocal(card) }, [card])

  const save = () => {
    if (typeof onSave === 'function') {
      onSave(local)
    } else {
      updateCard(semId, card.id, local)
    }
    onOpenChange(false)
  }

  const addChecklistItem = () => setLocal(c => ({ ...c, checklist: [...(c.checklist ?? []), { id: nanoid(), text: '', done: false }] }))
  const updateItem = item => setLocal(c => ({ ...c, checklist: c.checklist.map(i => i.id === item.id ? item : i) }))
  const deleteItem = id => setLocal(c => ({ ...c, checklist: c.checklist.filter(i => i.id !== id) }))

  if (!local) return null

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) save(); onOpenChange(v) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit card</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Card title" value={local.title} onChange={e => setLocal(c => ({ ...c, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={local.priority ?? ''} onValueChange={v => setLocal(c => ({ ...c, priority: v || null }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" className="h-8 text-sm" value={local.dueDate ?? ''}
              onChange={e => setLocal(c => ({ ...c, dueDate: e.target.value || null }))} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Checklist</p>
            {(local.checklist ?? []).map(item => (
              <ChecklistItem key={item.id} item={item} onChange={updateItem} onDelete={() => deleteItem(item.id)} />
            ))}
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={addChecklistItem}>
              <Plus className="h-3 w-3" /> Add item
            </Button>
          </div>
          <Button className="w-full" onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
