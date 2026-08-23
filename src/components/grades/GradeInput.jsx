import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { gradeScaleOf, parseGradeInput, isPartialDecimal } from '@/lib/gradeUtils'

export function GradeInput({ value, onChange, className }) {
  const scale = useStore(s => gradeScaleOf(s.settings))
  const [raw, setRaw] = useState(null)
  const focused = raw !== null
  const parsedValue = parseGradeInput(value)
  const display = focused
    ? raw
    : (parsedValue !== null ? parsedValue.toFixed(1) : '')

  const handleBlur = () => {
    onChange(parseGradeInput(raw, { min: 0, max: scale }))
    setRaw(null)
  }

  const handleChange = e => {
    const next = e.target.value
    if (isPartialDecimal(next)) setRaw(next)
  }

  return (
    <Input
      type="text" inputMode="decimal"
      placeholder="—"
      className={className}
      value={display}
      onFocus={() => setRaw(value !== null && value !== undefined ? String(value) : '')}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  )
}
