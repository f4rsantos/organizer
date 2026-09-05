const MIN_SATURATION = 40
const MIN_BOX_WIDTH = 24
const MIN_BOX_HEIGHT = 14
const MERGE_GAP = 2

function saturation(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b)
}

export function detectColouredMask(imageData) {
  const { data, width, height } = imageData
  const mask = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3]
    if (a < 128) continue
    if (saturation(data[i], data[i + 1], data[i + 2]) >= MIN_SATURATION) mask[p] = 1
  }
  return { mask, width, height }
}

function toHex(r, g, b) {
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function sampleColour(imageData, box) {
  const { data, width } = imageData
  const counts = new Map()
  const step = Math.max(1, Math.floor((box.y1 - box.y0) / 24))
  for (let y = box.y0; y <= box.y1; y += step) {
    for (const x of [box.x0, box.x1]) {
      const i = (width * y + x) << 2
      if (data[i + 3] < 128) continue
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      if (saturation(r, g, b) < MIN_SATURATION) continue
      const key = `${r >> 4},${g >> 4},${b >> 4}`
      const hit = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
      hit.n++; hit.r += r; hit.g += g; hit.b += b
      counts.set(key, hit)
    }
  }
  let best = null
  for (const hit of counts.values()) if (!best || hit.n > best.n) best = hit
  if (!best) return null
  return toHex(best.r / best.n, best.g / best.n, best.b / best.n)
}

function runsInColumn(mask, width, height, x) {
  const runs = []
  let start = null
  for (let y = 0; y < height; y++) {
    const on = mask[y * width + x] === 1
    if (on && start === null) start = y
    else if (!on && start !== null) {
      runs.push({ y0: start, y1: y - 1 })
      start = null
    }
  }
  if (start !== null) runs.push({ y0: start, y1: height - 1 })
  return runs.filter(r => r.y1 - r.y0 + 1 >= MIN_BOX_HEIGHT)
}

export function detectBoxes(imageData, { bounds } = {}) {
  const { mask, width, height } = detectColouredMask(imageData)
  const left = Math.max(0, Math.floor(bounds?.left ?? 0))
  const right = Math.min(width - 1, Math.floor(bounds?.right ?? width - 1))
  const top = Math.max(0, Math.floor(bounds?.top ?? 0))

  const columns = []
  for (let x = left; x <= right; x++) {
    const runs = runsInColumn(mask, width, height, x).filter(r => r.y1 >= top)
    if (runs.length) columns.push({ x, runs })
  }

  const boxes = []
  for (const col of columns) {
    for (const run of col.runs) {
      const open = boxes.find(b => (
        Math.abs(b.y0 - run.y0) <= MERGE_GAP &&
        Math.abs(b.y1 - run.y1) <= MERGE_GAP &&
        col.x - b.x1 <= MERGE_GAP + 1
      ))
      if (open) {
        open.x1 = col.x
        open.y0 = Math.min(open.y0, run.y0)
        open.y1 = Math.max(open.y1, run.y1)
      } else {
        boxes.push({ x0: col.x, x1: col.x, y0: run.y0, y1: run.y1 })
      }
    }
  }

  return boxes
    .filter(b => b.x1 - b.x0 + 1 >= MIN_BOX_WIDTH || b.y1 - b.y0 + 1 >= MIN_BOX_HEIGHT * 2)
    .map(b => ({ ...b, color: sampleColour(imageData, b) }))
    .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)
}

export function mergeAdjacentBoxes(boxes, { maxGap = 2 } = {}) {
  const out = []
  for (const box of boxes.slice().sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)) {
    const hit = out.find(o => (
      box.x0 <= o.x1 + maxGap && box.x1 >= o.x0 - maxGap &&
      box.y0 <= o.y1 + maxGap && box.y1 >= o.y0 - maxGap
    ))
    if (hit) {
      hit.x0 = Math.min(hit.x0, box.x0)
      hit.x1 = Math.max(hit.x1, box.x1)
      hit.y0 = Math.min(hit.y0, box.y0)
      hit.y1 = Math.max(hit.y1, box.y1)
      hit.color = hit.color ?? box.color
    } else {
      out.push({ ...box })
    }
  }
  return out
}
