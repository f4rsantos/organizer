import { cn } from '@/lib/utils'
import { SvgProgressWheel } from '@/components/common/SvgProgressWheel'
import { HABIT_WHEEL_SIZE } from './cellSize'

export function HabitCheckInButton({ done, restDay = false, label, onClick, pct = 0 }) {
  if (done) {
    return (
      <div style={{ width: HABIT_WHEEL_SIZE, height: HABIT_WHEEL_SIZE }}>
        <SvgProgressWheel pct={pct} size={HABIT_WHEEL_SIZE} strokeWidth={10} celebrate />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={restDay}
      className={cn(
        'rounded-full flex items-center justify-center border-2 border-dashed transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        restDay
          ? 'border-border text-muted-foreground opacity-50 cursor-default'
          : 'border-muted-foreground/40 text-muted-foreground hover:border-primary/60 hover:text-foreground hover:scale-105 active:scale-95',
      )}
      style={{ width: HABIT_WHEEL_SIZE, height: HABIT_WHEEL_SIZE }}
    >
      <span className="text-xs font-medium px-4 text-center leading-tight">{label}</span>
    </button>
  )
}
