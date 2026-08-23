import { useRef, useState } from 'react'
import { PRESET_COLORS } from '@/lib/constants'
import { useStrings } from '@/lib/strings'
import { useStore } from '@/store/useStore'

const HIDDEN_PICKER =
  'pointer-events-none absolute h-px w-px opacity-0 -left-px -top-px'

export function ClassColorDot({ color, onChange, compact = false }) {
  const pickerRef = useRef()
  const t = useStrings(useStore(s => s.lang ?? 'en'))
  const [draft, setDraft] = useState(null)
  const shown = draft ?? color

  const commit = value => {
    setDraft(null)
    if (value !== color) onChange(value)
  }

  const openPicker = () => pickerRef.current?.click()

  const hiddenInput = (
    <input ref={pickerRef} type="color" value={shown} tabIndex={-1}
      aria-hidden="true"
      onInput={e => setDraft(e.target.value)}
      onChange={e => commit(e.target.value)}
      onBlur={e => commit(e.target.value)}
      className={HIDDEN_PICKER} />
  )

  if (compact) {
    return (
      <span className="relative inline-flex shrink-0">
        {hiddenInput}
        <button type="button" onClick={openPicker}
          className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform shrink-0 touch-manipulation"
          title={t.colour} style={{ backgroundColor: shown }} />
      </span>
    )
  }

  return (
    <div className="relative flex gap-1.5 flex-wrap items-center">
      {hiddenInput}
      {PRESET_COLORS.map(c => (
        <button key={c} type="button" onClick={() => commit(c)}
          className="h-5 w-5 rounded-full transition-transform hover:scale-110 shrink-0 touch-manipulation"
          style={{ backgroundColor: c, outline: shown === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
        />
      ))}
      <button type="button" onClick={openPicker}
        className="h-5 w-5 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors shrink-0 touch-manipulation"
        title={t.colourCustom}
        style={{ backgroundColor: PRESET_COLORS.includes(shown) ? 'transparent' : shown }} />
    </div>
  )
}
