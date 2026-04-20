import { colorFromPct } from './utils'

export function TomatoCircle({ pct, faceIdx, size = 56, style }) {
  const r = size / 2
  const clampedPct = Math.min(1, Math.max(0, pct ?? 0))
  const rgb = colorFromPct(pct)
  const src = `${import.meta.env.BASE_URL}pomodoros/pomodoro${faceIdx + 1}.png`
  const faceSizePct = 150 + clampedPct * 30
  const faceZoom = 1.3

  return (
    <div style={{ width: size, height: size, position: 'relative', ...style }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={r} cy={r} r={r - 1} fill={rgb} />
      </svg>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: '50%',
          top: '35%',
          width: `${faceSizePct}%`,
          height: `${faceSizePct}%`,
          objectFit: 'contain',
          userSelect: 'none',
          transform: `translate(-50%, -50%) scale(${faceZoom})`,
          transformOrigin: 'center',
        }}
      />
    </div>
  )
}
