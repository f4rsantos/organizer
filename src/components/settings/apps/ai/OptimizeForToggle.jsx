import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'requests', labelKey: 'aiOptimizeRequestsShort' },
  { value: 'balanced', labelKey: 'aiOptimizeBalancedShort' },
  { value: 'tokens', labelKey: 'aiOptimizeTokensShort' },
]

const INDEX_BY_VALUE = { requests: 0, balanced: 1, tokens: 2 }

export function OptimizeForToggle({ t, value, onChange }) {
  const activeIndex = INDEX_BY_VALUE[value] ?? 1

  return (
    <div className="relative flex w-full items-center rounded-full bg-muted p-0.5 text-xs">
      <div
        className="absolute inset-y-0.5 w-1/3 rounded-full bg-background shadow-sm transition-transform"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'relative z-10 flex-1 min-w-0 truncate rounded-full px-1.5 py-1 text-center font-medium transition-colors',
            value === option.value ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {t[option.labelKey]}
        </button>
      ))}
    </div>
  )
}
