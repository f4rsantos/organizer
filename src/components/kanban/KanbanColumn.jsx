import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { KanbanCard } from './KanbanCard'
import { nanoid } from '@/lib/ids'

export function KanbanColumn({ col, cards, semId, prevColumnId = null, nextColumnId = null, localBoard }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const addCard = useStore(s => s.addKanbanCard)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  const handleAdd = () => {
    if (!title.trim()) return
    addCard(semId, { id: nanoid(), columnId: col.id, title: title.trim(), order: cards.length })
    setTitle('')
    setAdding(false)
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 h-full">
      <div className="flex items-center justify-between px-1 shrink-0">
        <h3 className="text-sm font-semibold">{col.title}</h3>
        <Badge variant="secondary" className="text-xs h-5">{cards.length}</Badge>
      </div>
      <div ref={setNodeRef}
        className={`flex flex-col gap-2 flex-1 rounded-xl p-2 overflow-y-auto transition-colors ${isOver ? 'bg-accent/60' : 'bg-secondary/40'}`}>
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              semId={semId}
              prevColumnId={prevColumnId}
              nextColumnId={nextColumnId}
              localBoard={localBoard}
            />
          ))}
        </SortableContext>
      </div>
      {adding
        ? (
          <div className="flex gap-2 px-1 shrink-0">
            <Input autoFocus className="flex-1 h-8 text-sm" placeholder={t.addCardPlaceholder} value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }} />
            <Button size="sm" className="h-8" onClick={handleAdd}>{t.save}</Button>
          </div>
        )
        : (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground mx-1 shrink-0"
            onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> {t.addCard}
          </Button>
        )
      }
    </div>
  )
}
