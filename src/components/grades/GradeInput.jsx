import { useState } from 'react'
import { Input } from '@/components/ui/input'

export function GradeInput({ value, onChange, className }) {
  const [raw, setRaw] = useState(null)
  const focused = raw !== null
  const display = focused
    ? raw
    : (value !== null && value !== undefined && value !== '' ? Number(value).toFixed(1) : '')

  const handleBlur = () => {
    if (raw === '' || raw === null) onChange(null)
    else onChange(Number(raw))
    setRaw(null)
  }

  return (
    <Input
      type="number" min={0} max={20} step={0.1}
      placeholder="—"
      className={className}
      value={display}
      onFocus={() => setRaw(value !== null && value !== undefined ? String(value) : '')}
      onBlur={handleBlur}
      onChange={e => setRaw(e.target.value)}
    />
  )
}
