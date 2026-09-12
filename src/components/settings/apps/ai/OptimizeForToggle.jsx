import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'requests', titleKey: 'aiOptimizeRequestsTitle', descKey: 'aiOptimizeRequestsDesc' },
  { value: 'tokens', titleKey: 'aiOptimizeTokensTitle', descKey: 'aiOptimizeTokensDesc' },
]

export function OptimizeForToggle({ t, value, onChange }) {
  return (
    <div className="space-y-2">
      {OPTIONS.map(option => (
        <button key={option.value} type="button" onClick={() => onChange(option.value)}
          className={cn(
            'w-full text-left rounded-xl border p-3 transition-colors',
            value === option.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
          )}>
          <p className="text-sm font-medium">{t[option.titleKey]}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t[option.descKey]}</p>
        </button>
      ))}
    </div>
  )
}
