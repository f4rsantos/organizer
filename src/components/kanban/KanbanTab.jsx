import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { KanbanBoard } from './KanbanBoard'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useMergedKanbanBoard } from '@/hooks/useMergedKanbanBoard'

const FREE_BOARD_ID = '__free__'

export function KanbanTab() {
  const noneMode = useStore(s => s.settings?.semesterMode === 'none')
  const storeActiveSemesterId = useStore(s => s.activeSemesterId)
  const activeSemesterId = noneMode ? null : storeActiveSemesterId
  const boardId = activeSemesterId ?? FREE_BOARD_ID
  const localBoard = useStore(s => s.kanban?.[boardId])
  const board = useMergedKanbanBoard(activeSemesterId)
  const clearDone = useStore(s => s.clearKanbanDone)
  const wipeAll = useStore(s => s.wipeKanban)
  const ensureBoard = useStore(s => s.ensureKanbanBoard)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (noneMode && !localBoard?.columns?.length) ensureBoard(FREE_BOARD_ID)
  }, [noneMode, localBoard, ensureBoard])

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-screen p-4 pt-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-lg font-semibold">{t.kanban}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirm('done')}>
            {t.clearDone}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setConfirm('all')}>
            {t.wipeAll}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto flex">
        <KanbanBoard semId={boardId} board={board} localBoard={localBoard} />
      </div>

      <ConfirmDialog open={confirm === 'done'} onOpenChange={v => !v && setConfirm(null)}
        title={t.clearDoneTitle} description={t.clearDoneDesc}
        onConfirm={() => clearDone(boardId)} />
      <ConfirmDialog open={confirm === 'all'} onOpenChange={v => !v && setConfirm(null)}
        title={t.wipeAllTitle} description={t.wipeAllDesc}
        onConfirm={() => wipeAll(boardId)} />
    </div>
  )
}
