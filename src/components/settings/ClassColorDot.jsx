import { useRef } from 'react'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
]

export function ClassColorDot({ color, onChange }) {
  const pickerRef = useRef()

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
