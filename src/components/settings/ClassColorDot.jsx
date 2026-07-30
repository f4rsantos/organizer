import { useRef } from 'react'
import { PRESET_COLORS } from '@/lib/constants'

export function ClassColorDot({ color, onChange, compact = false }) {
  const pickerRef = useRef()

  if (compact) {
    return (
      <button type="button" onClick={() => pickerRef.current?.click()}
        className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform shrink-0 overflow-hidden relative"
        title="Colour" style={{ backgroundColor: color }}>
        <input ref={pickerRef} type="color" value={color} onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
      </button>
    )
  }

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {PRESET_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full transition-transform hover:scale-110 shrink-0"
          style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
        />
      ))}
      <button type="button" onClick={() => pickerRef.current?.click()}
        className="h-5 w-5 rounded-full border-2 border-dashed border-border hover:border-primary transition-colors shrink-0 overflow-hidden relative"
        title="Custom colour"
        style={{ backgroundColor: PRESET_COLORS.includes(color) ? 'transparent' : color }}>
        <input ref={pickerRef} type="color" value={color} onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
      </button>
    </div>
  )
}
