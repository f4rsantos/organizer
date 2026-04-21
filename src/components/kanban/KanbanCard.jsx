import { useEffect, useMemo, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, ExternalLink, Menu, Share2, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { CardDetailDialog } from './CardDetailDialog'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { useStrings } from '@/lib/strings'
import { useCollabActions } from '@/hooks/useCollabActions'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PRIORITY_DOT = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-emerald-500' }

export function KanbanCard({ card, semId, prevColumnId = null, nextColumnId = null, localBoard }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareTeamId, setShareTeamId] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const deleteCard = useStore(s => s.deleteKanbanCard)
  const moveCard = useStore(s => s.moveKanbanCard)
  const updateCard = useStore(s => s.updateKanbanCard)
  const checklistPreviewMode = useStore(s => s.settings?.kanbanChecklistPreviewMode
    ?? (s.settings?.kanbanShowChecklistInline ? 'all' : 'none'))
  const tasks = useStore(s => s.tasks ?? [])
  const classes = useStore(s => s.classes ?? [])
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const {
    teams,
    getTeamName,
    shareKanbanCardToTeam,
    moveSharedCard,
    updateSharedCard,
    deleteSharedCard,
  } = useCollabActions()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const isSharedRemote = !!card?.sharedMeta?.remote
  const sharedTeamId = card?.sharedMeta?.teamId
  const sharedCardId = card?.sharedMeta?.sharedCardId
  const sourceTask = card?.sourceTaskId ? tasks.find(task => task.id === card.sourceTaskId) : null
  const isBackedBySharedTask = !!sourceTask?.sharedRef?.teamId
  const sharedBadgeText = useMemo(() => {
    const teamId = card?.sharedMeta?.teamId ?? sourceTask?.sharedRef?.teamId
    if (!teamId) return null
    return getTeamName(teamId) ?? 'shared'
  }, [card?.sharedMeta?.teamId, sourceTask?.sharedRef?.teamId, getTeamName])
  const canShareCard = !isSharedRemote && !isBackedBySharedTask && teams.length > 0

  const style = { transform: CSS.Transform.toString(transform), transition }
  const checklist = card.checklist ?? []
  const donePct = checklist.length ? checklist.filter(i => i.done).length / checklist.length : null
  const showChecklistInline = checklistPreviewMode === 'all'
    || (checklistPreviewMode === 'card' && card?.checklistPreview === true)
  const classBadgeText = useMemo(() => {
    const fallback = typeof card?.className === 'string' ? card.className.trim() : ''
    if (fallback) return fallback
    if (!card?.classId) return null
    const semClasses = classes.filter(cls => cls?.semesterId === semId)
    return semClasses.find(cls => cls.id === card.classId)?.name ?? null
  }, [card?.classId, card?.className, classes, semId])

  const toggleChecklistItem = async (itemId, done) => {
    const patch = {
      checklist: checklist.map(item => item.id === itemId ? { ...item, done } : item),
    }
    if (isSharedRemote) {
      await updateSharedCard({ teamId: sharedTeamId, sharedCardId, patch })
      return
    }
    updateCard(semId, card.id, patch)
  }

  useEffect(() => {
    if (!menuOpen) return
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleMoveLeft = async () => {
    if (!prevColumnId) return
    if (isSharedRemote) {
      await moveSharedCard({ teamId: sharedTeamId, sharedCardId, targetColumnId: prevColumnId })
      return
    }
    moveCard(semId, card.id, prevColumnId)
  }

  const handleMoveRight = async () => {
    if (!nextColumnId) return
    if (isSharedRemote) {
      await moveSharedCard({ teamId: sharedTeamId, sharedCardId, targetColumnId: nextColumnId })
      return
    }
    moveCard(semId, card.id, nextColumnId)
  }

  const handleDelete = async () => {
    if (isSharedRemote) {
      await deleteSharedCard({ teamId: sharedTeamId, sharedCardId })
      return
    }
    deleteCard(semId, card.id)
  }

  const handleSave = async patch => {
    if (isSharedRemote) {
      await updateSharedCard({ teamId: sharedTeamId, sharedCardId, patch })
      return
    }
    updateCard(semId, card.id, patch)
  }

  const handleShare = async () => {
    if (!shareTeamId) return
    await shareKanbanCardToTeam({
      card,
      teamId: shareTeamId,
      semId,
      localBoard,
    })
    setShareOpen(false)
    setShareTeamId('')
  }

  const openShare = async () => {
    if (!canShareCard) return
    if (teams.length === 1) {
      await shareKanbanCardToTeam({
        card,
        teamId: teams[0].teamId,
        semId,
        localBoard,
      })
      return
    }
    setShareOpen(true)
  }

  return (
    <>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        className={cn('rounded-lg border border-border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing select-none',
          'transition-shadow hover:shadow-md',
          isDragging && 'scale-105 shadow-2xl rotate-1 opacity-90')}>
        <div className="flex items-start gap-2">
          {card.priority && <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', PRIORITY_DOT[card.priority])} />}
          <p className="flex-1 text-sm font-medium leading-snug">{card.title || 'Untitled'}</p>
          <div ref={menuRef} className="flex gap-1 shrink-0">
            {menuOpen ? (
              <>
                {prevColumnId && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title={t.moveLeft}
                    onPointerDown={e => e.stopPropagation()} onClick={() => { handleMoveLeft(); setMenuOpen(false) }}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
                {nextColumnId && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title={t.moveRight}
                    onPointerDown={e => e.stopPropagation()} onClick={() => { handleMoveRight(); setMenuOpen(false) }}>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canShareCard && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onPointerDown={e => e.stopPropagation()} onClick={() => { openShare(); setMenuOpen(false) }}>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onPointerDown={e => e.stopPropagation()} onClick={() => { setDetailOpen(true); setMenuOpen(false) }}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onPointerDown={e => e.stopPropagation()} onClick={() => { handleDelete(); setMenuOpen(false) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onPointerDown={e => e.stopPropagation()} onClick={() => setMenuOpen(true)}>
                <Menu className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {card.dueDate && <Badge variant="secondary" className="text-xs h-5">{card.dueDate}</Badge>}
        {classBadgeText && <Badge variant="secondary" className="text-xs h-5">{classBadgeText}</Badge>}
        {sharedBadgeText && <Badge variant="outline" className="text-xs h-5">{sharedBadgeText}</Badge>}
        {checklist.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${donePct * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{checklist.filter(i => i.done).length}/{checklist.length}</span>
          </div>
        )}
        {showChecklistInline && checklist.length > 0 && (
          <div className="space-y-1.5 pt-1" onPointerDown={e => e.stopPropagation()}>
            {checklist.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox checked={item.done} onCheckedChange={done => toggleChecklistItem(item.id, done === true)} />
                <span className={cn('text-xs leading-snug', item.done && 'line-through text-muted-foreground')}>
                  {item.text || '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <CardDetailDialog open={detailOpen} onOpenChange={setDetailOpen} card={card} semId={semId} onSave={handleSave} />
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share card</DialogTitle>
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
