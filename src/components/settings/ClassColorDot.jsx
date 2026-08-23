import { useState } from 'react'
import { PRESET_COLORS } from '@/lib/constants'
import { useStrings } from '@/lib/strings'
import { useStore } from '@/store/useStore'

const PICKER_INPUT =
  'absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 opacity-0'

export function ClassColorDot({ color, onChange, compact = false }) {
  const t = useStrings(useStore(s => s.lang ?? 'en'))
  const [draft, setDraft] = useState(null)
  const shown = draft ?? color

  const commit = value => {
    setDraft(null)
    if (value !== color) onChange(value)
  }

  const pickerInput = (
    <input type="color" value={shown}
      title={compact ? t.colour : t.colourCustom}
      onInput={e => setDraft(e.target.value)}
      onChange={e => commit(e.target.value)}
      onBlur={e => commit(e.target.value)}
      className={PICKER_INPUT} />
  )

  if (compact) {
    return (
      <span className="relative inline-flex h-6 w-6 shrink-0 rounded-full border border-border overflow-hidden touch-manipulation hover:scale-110 transition-transform"
        style={{ backgroundColor: shown }}>
        {pickerInput}
      </span>
    )
  }

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {PRESET_COLORS.map(c => (
        <button key={c} type="button" onClick={() => commit(c)}
          className="h-5 w-5 rounded-full transition-transform hover:scale-110 shrink-0 touch-manipulation"
          style={{ backgroundColor: c, outline: shown === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
        />
      ))}
      <span className="relative inline-flex h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden touch-manipulation"
        style={{ backgroundColor: PRESET_COLORS.includes(shown) ? 'transparent' : shown }}>
        {pickerInput}
      </span>
    </div>
  )
}
