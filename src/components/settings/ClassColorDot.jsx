import { useState } from 'react'
import { PRESET_COLORS } from '@/lib/constants'
import { useStrings } from '@/lib/strings'
import { useStore } from '@/store/useStore'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const PICKER_INPUT =
  'absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 opacity-0'

function ColorSwatch({ color, size = 'h-6 w-6', title, onClick }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`${size} shrink-0 rounded-full border border-border touch-manipulation hover:scale-110 transition-transform`}
      style={{ backgroundColor: color }} />
  )
}

function ColorPalette({ shown, onPick, onCustomInput, onCustomChange, onCustomBlur, t }) {
  return (
    <div className="flex gap-1.5 flex-wrap items-center max-w-[180px]">
      {PRESET_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onPick(c)}
          className="h-6 w-6 rounded-full transition-transform hover:scale-110 shrink-0 touch-manipulation"
          style={{ backgroundColor: c, outline: shown === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
        />
      ))}
      <span className="relative inline-flex h-6 w-6 shrink-0 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden touch-manipulation"
        style={{ backgroundColor: PRESET_COLORS.includes(shown) ? 'transparent' : shown }}>
        <input type="color" value={shown} title={t.colourCustom}
          onInput={onCustomInput} onChange={onCustomChange} onBlur={onCustomBlur}
          className={PICKER_INPUT} />
      </span>
    </div>
  )
}

export function ClassColorDot({ color, onChange, compact = false }) {
  const t = useStrings(useStore(s => s.lang ?? 'en'))
  const [draft, setDraft] = useState(null)
  const [open, setOpen] = useState(false)
  const shown = draft ?? color

  const commit = value => {
    setDraft(null)
    if (value !== color) onChange(value)
  }

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<ColorSwatch color={shown} title={t.colour} />} />
        <PopoverContent>
          <ColorPalette shown={shown} t={t}
            onPick={c => { commit(c); setOpen(false) }}
            onCustomInput={e => setDraft(e.target.value)}
            onCustomChange={e => commit(e.target.value)}
            onCustomBlur={e => commit(e.target.value)} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <ColorPalette shown={shown} t={t}
      onPick={commit}
      onCustomInput={e => setDraft(e.target.value)}
      onCustomChange={e => commit(e.target.value)}
      onCustomBlur={e => commit(e.target.value)} />
  )
}
