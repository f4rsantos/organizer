import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { gradeScaleOf } from '@/lib/gradeUtils'

export function GradeInput({ value, onChange, className }) {
  const scale = useStore(s => gradeScaleOf(s.settings))
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
      type="number" min={0} max={scale} step={0.1}
      placeholder="—"
      className={className}
      value={display}
      onFocus={() => setRaw(value !== null && value !== undefined ? String(value) : '')}
      onBlur={handleBlur}
      onChange={e => setRaw(e.target.value)}
    />
  )
}
