import { useEffect, useState } from 'react'

export function AnalogClock({ size = 90 }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const s = now.getSeconds()
  const m = now.getMinutes() + s / 60
  const h = (now.getHours() % 12) + m / 60
  const c = size / 2
  const hand = (angle, len, width, color) => {
    const rad = (angle - 90) * (Math.PI / 180)
    return (
      <line x1={c} y1={c} x2={c + len * Math.cos(rad)} y2={c + len * Math.sin(rad)}
        stroke={color} strokeWidth={width} strokeLinecap="round" />
    )
  }

  return (
    <svg width={size} height={size}>
      {Array.from({ length: 12 }, (_, i) => {
        const rad = (i * 30 - 90) * (Math.PI / 180)
        const r1 = c - 5
        const r2 = c - 9
        return <line key={i} x1={c + r1 * Math.cos(rad)} y1={c + r1 * Math.sin(rad)}
          x2={c + r2 * Math.cos(rad)} y2={c + r2 * Math.sin(rad)} stroke="var(--muted-foreground)" strokeWidth="1" />
      })}
      {hand(h * 30, c * 0.45, 3, 'var(--foreground)')}
      {hand(m * 6, c * 0.68, 2, 'var(--foreground)')}
      {hand(s * 6, c * 0.75, 1, 'var(--wheel-primary)')}
      <circle cx={c} cy={c} r={2.5} fill="var(--wheel-primary)" />
    </svg>
  )
}
