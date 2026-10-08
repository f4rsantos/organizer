import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { isPartialDecimal, parseGradeInput } from '@/lib/gradeUtils'

export function SubcomponentPercent({ percent, onChange }) {
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)
  const [draft, setDraft] = useState(null)

  if (!onChange) return <span className="text-muted-foreground/40">· {percent}%</span>

  const commit = () => {
    const next = parseGradeInput(draft, { min: 0 })
    setDraft(null)
    if (next !== null && next !== percent) onChange(next)
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') setDraft(null)
  }

  if (draft !== null) {
    return (
      <span className="text-muted-foreground/70">
        · <input
          autoFocus
          type="text" inputMode="decimal"
          value={draft}
          onChange={e => isPartialDecimal(e.target.value) && setDraft(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-12 rounded border border-border bg-transparent px-1 text-xs outline-none focus:border-primary"
        />%
      </span>
    )
  }

  return (
    <span
      onDoubleClick={() => setDraft(String(percent))}
      title={t.editPartWeightTitle}
      className="cursor-text select-none text-muted-foreground/40 hover:text-muted-foreground"
    >
      · {percent}%
    </span>
  )
}
