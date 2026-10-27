import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

export function BreakChip({ icon: Icon, label, onClick }) {
  const isIconsOnly = useStore(s => s.settings?.navbar?.labelMode === 'icons')
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4-safe', isIconsOnly ? 'bottom-above-tab-bar-compact' : 'bottom-above-tab-bar')}>
      <button type="button" onClick={onClick}
        className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </button>
    </div>
  )
}
