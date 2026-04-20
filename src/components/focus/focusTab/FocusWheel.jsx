const SIZE = 200
const SW = 12
const R = (SIZE - SW) / 2
const CIRC = 2 * Math.PI * R

export function FocusWheel({ pct, isBreak, label, sublabel, centerOverlay = null }) {
  const offset = CIRC * (1 - Math.min(1, Math.max(0, pct)))
  const color = isBreak ? '#f59e0b' : 'url(#focusGrad)'

  return (
    <div className="relative z-20 flex flex-col items-center gap-1">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          <defs>
            <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--wheel-primary, oklch(0.6 0.2 260))" />
              <stop offset="100%" stopColor="oklch(0.65 0.15 280)" />
            </linearGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--wheel-track)" strokeWidth={SW} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.4s ease' }}
          />
        </svg>

        {centerOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {centerOverlay}
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10">
          <span className={`text-3xl font-semibold tabular-nums leading-none ${isBreak ? 'text-amber-400' : 'text-foreground'}`}>
            {label}
          </span>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
      </div>
    </div>
  )
}
