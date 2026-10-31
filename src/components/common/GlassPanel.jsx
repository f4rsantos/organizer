import { cn } from '@/lib/utils'

const THEME_HUES = ['var(--wheel-primary)', 'var(--wheel-to)', 'var(--primary)']
const AURORA_STRENGTH_PCT = 22
const AURORA_SPOTS = [
  { at: '12% 0%', size: '45% 95%' },
  { at: '48% 0%', size: '40% 80%' },
  { at: '86% 0%', size: '45% 100%' },
]
const AURORA_FADE = [
  'linear-gradient(to bottom, #000 25%, transparent)',
  'linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)',
].join(', ')

export function GlassPanel({ className, children }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur-2xl backdrop-saturate-150',
      'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_10px_28px_-22px_rgb(0_0_0/0.25)]',
      'dark:bg-card/60 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.05),0_10px_28px_-22px_rgb(0_0_0/0.6)]',
      className,
    )}>
      {children}
    </div>
  )
}

export function GlassList({ className, children }) {
  return (
    <GlassPanel className={cn('divide-y divide-border/60', className)}>
      {children}
    </GlassPanel>
  )
}

function auroraLayer(color, { at, size }) {
  return `radial-gradient(${size} at ${at}, color-mix(in oklch, ${color} ${AURORA_STRENGTH_PCT}%, transparent), transparent 75%)`
}

export function AmbientGlow({ hues = THEME_HUES }) {
  const layers = AURORA_SPOTS.map((spot, i) => auroraLayer(hues[i % hues.length], spot))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 dark:opacity-70"
      style={{
        backgroundImage: layers.join(', '),
        maskImage: AURORA_FADE,
        WebkitMaskImage: AURORA_FADE,
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }} />
  )
}
