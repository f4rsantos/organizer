import { cn } from '@/lib/utils'

const TRACK_PADDING_PX = 2

export function PillSwitch({ options, value, onChange, className, optionClassName }) {
  const activeIndex = Math.max(0, options.findIndex(option => option.value === value))

  return (
    <div
      role="radiogroup"
      className={cn('relative grid rounded-full bg-muted/60 p-0.5', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        className="absolute inset-y-0.5 rounded-full bg-background shadow-sm transition-transform duration-200 ease-out"
        style={{
          left: TRACK_PADDING_PX,
          width: `calc((100% - ${TRACK_PADDING_PX * 2}px) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => !active && onChange(option.value)}
            className={cn(
              'relative z-10 flex min-w-0 items-center justify-center truncate rounded-full px-2 py-1.5 text-xs transition-colors',
              active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
              optionClassName,
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
