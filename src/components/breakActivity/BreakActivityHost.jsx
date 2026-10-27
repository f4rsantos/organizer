import { useEffect, useState } from 'react'
import { ExternalLink, Grid3x3 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { generateSudoku, isSudokuSolved } from '@/lib/breakActivity/sudoku'
import { normalizeBreakUrl } from '@/lib/breakActivity/breakSettings'
import { useBreakLink } from './useBreakLink'
import { BreakChip } from './BreakChip'
import { BreakSudokuDialog } from './BreakSudokuDialog'

function BreakLink({ url, onBreak, t }) {
  const { blocked, openLink } = useBreakLink(url, onBreak)
  if (!blocked) return null
  return <BreakChip icon={ExternalLink} label={t.breakActivityPopupBlocked} onClick={openLink} />
}

function BreakSudoku({ onBreak, difficulty, t }) {
  const game = useStore(s => s.breakSudoku)
  const setBreakSudoku = useStore(s => s.setBreakSudoku)
  const [open, setOpen] = useState(onBreak)
  const [wasOnBreak, setWasOnBreak] = useState(onBreak)
  if (onBreak !== wasOnBreak) {
    setWasOnBreak(onBreak)
    setOpen(onBreak)
  }

  useEffect(() => {
    if (!onBreak) return
    const current = useStore.getState().breakSudoku
    if (!current || isSudokuSolved(current)) setBreakSudoku(generateSudoku({ difficulty }))
  }, [onBreak, difficulty, setBreakSudoku])

  if (!onBreak || !game) return null
  return (
    <>
      {!open && <BreakChip icon={Grid3x3} label={t.sudoku} onClick={() => setOpen(true)} />}
      <BreakSudokuDialog open={open} onOpenChange={setOpen} game={game} difficulty={difficulty} t={t} />
    </>
  )
}

export function BreakActivityHost() {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const config = useStore(s => s.settings?.breakActivity)
  const onBreak = useStore(s => s.focusSync?.phase === 'break')

  if (!config?.enabled) return null
  if (config.mode === 'link') return <BreakLink url={normalizeBreakUrl(config.url)} onBreak={onBreak} t={t} />
  return <BreakSudoku onBreak={onBreak} difficulty={config.difficulty} t={t} />
}
