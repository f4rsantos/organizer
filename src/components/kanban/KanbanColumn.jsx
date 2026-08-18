import { useMemo, useState } from 'react'
import { useDroppable, useDndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout'
import { KanbanCard } from './KanbanCard'
import { computeCardGroups, cardsInGroup } from '@/lib/kanbanGrouping'

function DividerLine({ label }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-border" />
      {label && <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>}
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export function KanbanColumn({ col, cards, semId, prevColumnId = null, nextColumnId = null, doneColumnId = null, localBoard, boardGroups = null }) {
  const [adding, setAdding] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [title, setTitle] = useState('')
  const addCard = useStore(s => s.addKanbanCard)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const separateByTeam = useStore(s => s.settings?.kanbanSeparateByTeam ?? true)
  const separateByClass = useStore(s => s.settings?.kanbanSeparateByClass ?? false)
  const runtimeTeams = useStore(s => s.collabRuntime?.teams ?? {})
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const isDesktop = useIsDesktopLayout()
  const { over } = useDndContext()
  const isOverColumn = isOver || (over?.id != null && cards.some(c => c.id === over.id))

  const personalLabel = t.collabPersonal ?? 'Personal'

  const ownGroupDescriptors = useMemo(
    () => computeCardGroups(cards, separateByTeam, separateByClass, runtimeTeams, personalLabel),
    [cards, separateByTeam, separateByClass, runtimeTeams, personalLabel],
  )
  const isBanded = isDesktop && Boolean(boardGroups) && boardGroups.length > 1
  const groupDescriptors = isBanded ? boardGroups : ownGroupDescriptors
  const groups = useMemo(
    () => groupDescriptors.map(group => ({ ...group, cards: cardsInGroup(cards, group) })),
    [groupDescriptors, cards],
  )

  const handleAdd = () => {
    if (!title.trim()) return
    addCard(semId, { title: title.trim(), columnId: col.id, order: cards.length })
    setTitle('')
    setAdding(false)
  }

  return (
    <div ref={setNodeRef}
      className={cn('relative flex w-full md:min-w-56 shrink-0 flex-col gap-2 rounded-xl p-2 transition-colors',
        isBanded ? 'md:grid md:[grid-row:1/-1] md:[grid-template-rows:subgrid] md:gap-0' : 'md:flex-1 md:h-full',
        isOverColumn ? 'bg-accent/60 ring-2 ring-inset ring-primary' : 'bg-secondary/40')}>
      <button type="button" onClick={() => setCollapsed(v => !v)}
        className={cn('flex items-center justify-between px-1 shrink-0 md:cursor-default', isBanded && 'md:pb-1')}
        style={isBanded ? { gridRow: 1 } : undefined}>
        <span className="flex items-center gap-1.5">
          <span className="md:hidden text-muted-foreground">
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
          <h3 className="text-sm font-semibold">{col.title}</h3>
        </span>
        <Badge variant="secondary" className="text-xs h-5">{cards.length}</Badge>
      </button>
      {!collapsed && (
        <>
          <div
            className={isBanded ? 'contents' : 'flex flex-col gap-2 md:flex-1 md:overflow-y-auto'}
          >
            <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {groups.map((group, gi) => (
                isBanded
                  ? (
                    <div key={group.key} className="contents">
                      <div style={{ gridRow: gi * 2 + 2 }}>
                        <DividerLine label={group.label} />
                      </div>
                      <div style={{ gridRow: gi * 2 + 3 }} className="flex flex-col gap-2 min-h-2 pb-2">
                        {group.cards.map(card => (
                          <KanbanCard
                            key={card.id}
                            card={card}
                            semId={semId}
                            prevColumnId={prevColumnId}
                            nextColumnId={nextColumnId}
                            doneColumnId={doneColumnId}
                            localBoard={localBoard}
                          />
                        ))}
                      </div>
                    </div>
                  )
                  : (
                    <div key={group.key}>
                      {(gi > 0 || group.label) && <DividerLine label={group.label} />}
                      <div className="flex flex-col gap-2">
                        {group.cards.map(card => (
                          <KanbanCard
                            key={card.id}
                            card={card}
                            semId={semId}
                            prevColumnId={prevColumnId}
                            nextColumnId={nextColumnId}
                            doneColumnId={doneColumnId}
                            localBoard={localBoard}
                          />
                        ))}
                      </div>
                    </div>
                  )
              ))}
            </SortableContext>
          </div>
          {adding
            ? (
              <div className={cn('flex gap-2 px-1 shrink-0', isBanded && 'md:self-end')} style={isBanded ? { gridRow: -1 } : undefined}>
                <Input autoFocus className="flex-1 h-8 text-sm" placeholder={t.addCardPlaceholder} value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }} />
                <Button size="sm" className="h-8" onClick={handleAdd}>{t.save}</Button>
              </div>
            )
            : (
              <Button variant="ghost" size="sm" className={cn('gap-1 text-muted-foreground hover:text-foreground mx-1 shrink-0', isBanded && 'md:self-end')}
                onClick={() => setAdding(true)} style={isBanded ? { gridRow: -1 } : undefined}>
                <Plus className="h-3.5 w-3.5" /> {t.addCard}
              </Button>
            )
          }
        </>
      )}
    </div>
  )
}
