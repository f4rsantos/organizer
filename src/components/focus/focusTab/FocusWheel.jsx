const DEFAULT_SIZE = 200
const STROKE_WIDTH_RATIO = 12 / 200

export function FocusWheel({ pct, isBreak, label, sublabel, centerOverlay = null, size = DEFAULT_SIZE, ...rest }) {
  const strokeWidth = size * STROKE_WIDTH_RATIO
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, Math.max(0, pct)))
  const color = isBreak ? '#f59e0b' : 'url(#focusGrad)'
  const labelFontSize = size * (30 / 200)
  const sublabelFontSize = size * (12 / 200)

  return (
    <div className="relative z-20 flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size, borderRadius: '50%' }} {...rest}>
        <svg width={size} height={size}>
          <defs>
            <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--wheel-primary, oklch(0.6 0.2 260))" />
              <stop offset="100%" stopColor="var(--wheel-to, oklch(0.65 0.15 280))" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--wheel-track)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.4s ease' }}
          />
        </svg>

        {centerOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'translateY(50px)' }}>
            {centerOverlay}
          </div>
        )}

        {(label || sublabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 z-10">
            {label && (
              <span
                className={`font-semibold tabular-nums leading-none ${isBreak ? 'text-amber-400' : 'text-foreground'}`}
                style={{ fontSize: labelFontSize }}
              >
                {label}
              </span>
            )}
            {sublabel && <span className="text-muted-foreground" style={{ fontSize: sublabelFontSize }}>{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
