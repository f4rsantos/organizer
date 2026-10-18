import { useState } from 'react'
import { SettingList, SettingRow } from './SettingRow'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store/useStore'
import { useStrings } from '@/lib/strings'
import { DEFAULT_GRADE_SCALE, DEFAULT_PASS_THRESHOLD, gradeScaleOf, passThresholdOf, parseGradeInput, isPartialDecimal } from '@/lib/gradeUtils'

function NumberField({ value, onCommit, min, max }) {
  const [raw, setRaw] = useState(null)

  const commit = () => {
    onCommit(parseGradeInput(raw, { min, max }))
    setRaw(null)
  }

  return (
    <Input
      type="text" inputMode="decimal"
      className="w-24 h-8 text-sm text-center"
      value={raw ?? value}
      onFocus={() => setRaw(String(value))}
      onBlur={commit}
      onChange={e => { if (isPartialDecimal(e.target.value)) setRaw(e.target.value) }}
    />
  )
}

export function GradeScaleSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const lang = useStore(s => s.lang ?? 'en')
  const t = useStrings(lang)

  const scale = gradeScaleOf(settings)
  const passThreshold = passThresholdOf(settings)

  const handleScale = value => {
    const next = value !== null && value > 0 ? value : DEFAULT_GRADE_SCALE
    updateSettings({
      gradeScale: next,
      ...(passThreshold > next ? { passThreshold: next } : {}),
    })
  }

  const handlePassThreshold = value => {
    const next = value !== null && value >= 0 ? Math.min(value, scale) : DEFAULT_PASS_THRESHOLD
    updateSettings({ passThreshold: next })
  }

  return (
    <SettingList>
      <SettingRow label={t.gradeScaleLabel} desc={t.gradeScaleDesc}
        control={<NumberField value={scale} onCommit={handleScale} min={1} max={1000} />} />
      <SettingRow label={t.passingGradeLabel} desc={t.passingGradeDesc}
        control={<NumberField value={passThreshold} onCommit={handlePassThreshold} min={0} max={scale} />} />
    </SettingList>
  )
}
