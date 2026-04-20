export function CenterPomodoro({ pct, faceIdx, size = 56 }) {
  const r = size / 2
  const green = [82, 168, 95]
  const yellow = [219, 178, 50]
  const red = [194, 102, 102]
  const lerp = (a, b, t) => Math.round(a + (b - a) * t)
  const clamped = Math.min(1, Math.max(0, pct ?? 0))
  const tone = clamped <= 0.5
    ? [
        lerp(green[0], yellow[0], clamped / 0.5),
        lerp(green[1], yellow[1], clamped / 0.5),
        lerp(green[2], yellow[2], clamped / 0.5),
      ]
    : [
        lerp(yellow[0], red[0], (clamped - 0.5) / 0.5),
        lerp(yellow[1], red[1], (clamped - 0.5) / 0.5),
        lerp(yellow[2], red[2], (clamped - 0.5) / 0.5),
      ]

  const soften = v => Math.round(v * 0.82 + 245 * 0.18)
  const fill = `rgba(${soften(tone[0])}, ${soften(tone[1])}, ${soften(tone[2])}, 0.92)`
  const src = `${import.meta.env.BASE_URL}pomodoros/pomodoro${faceIdx + 1}.png`
  const faceSizePct = 150 + clamped * 30
  const faceZoom = 1.3

  return (
    <div style={{ width: size, height: size, position: 'relative', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={r} cy={r} r={r - 1} fill={fill} />
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
          transition: 'width 120ms linear, height 120ms linear, transform 120ms linear',
        }}
      />
    </div>
  )
}
