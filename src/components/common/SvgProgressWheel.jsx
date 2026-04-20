import { useEffect, useId, useRef, useState } from 'react'
import { Check } from 'lucide-react'

export function SvgProgressWheel({ pct = 0, size = 120, strokeWidth = 10, label, sublabel, celebrate = false }) {
  const gradId = useId()
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(1, pct))
  const done = pct >= 1

  const [spinning, setSpinning] = useState(false)
  const prevPct = useRef(pct)

  useEffect(() => {
    if (celebrate && pct >= 1 && prevPct.current < 1) {
      setSpinning(true)
      const t = setTimeout(() => setSpinning(false), 1200)
      prevPct.current = pct
      return () => clearTimeout(t)
    }
    if (pct < 1) setSpinning(false)
    prevPct.current = pct
  }, [pct, celebrate])

  const trackColor = done ? 'none' : 'var(--wheel-track)'
  const strokeColor = done ? `url(#${gradId})` : `url(#${gradId})`

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}
          className={spinning ? 'animate-spin' : ''}
          style={{ transition: spinning ? 'none' : undefined,
            animationDuration: spinning ? '0.9s' : undefined,
            animationTimingFunction: 'ease-in-out' }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={done ? '#22c55e' : 'var(--wheel-primary)'} />
              <stop offset="100%" stopColor={done ? '#86efac' : 'oklch(0.65 0.15 280)'} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={trackColor} strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={strokeColor} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), stroke 400ms ease' }}
          />
        </svg>
        {done && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="text-emerald-500" style={{ width: size * 0.35, height: size * 0.35 }}
              strokeWidth={2.5} />
          </div>
        )}
      </div>
      {label && <span className="text-sm font-medium text-foreground text-center">{label}</span>}
      {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
    </div>
  )
}
