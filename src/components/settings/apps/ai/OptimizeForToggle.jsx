import { PillSwitch } from '@/components/common/PillSwitch'

const OPTIONS = [
  { value: 'requests', labelKey: 'aiOptimizeRequestsShort' },
  { value: 'balanced', labelKey: 'aiOptimizeBalancedShort' },
  { value: 'tokens', labelKey: 'aiOptimizeTokensShort' },
]

export function OptimizeForToggle({ t, value, onChange }) {
  return (
    <PillSwitch
      className="w-full"
      optionClassName="px-1.5 py-1"
      options={OPTIONS.map(option => ({ value: option.value, label: t[option.labelKey] }))}
      value={value ?? 'balanced'}
      onChange={onChange}
    />
  )
}
