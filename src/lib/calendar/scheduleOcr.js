import { detectBoxes, mergeAdjacentBoxes } from './scheduleBoxes'

const BASE = import.meta.env.BASE_URL || '/'
const ASSETS = `${BASE.endsWith('/') ? BASE : `${BASE}/`}tesseract/`

let loading = null

function loadTesseract() {
  if (loading) return loading
  loading = import('tesseract.js').then(mod => mod.default ?? mod)
  loading.catch(() => { loading = null })
  return loading
}

export function releaseOcr() {
  loading = null
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image-decode-failed')) }
    img.src = url
  })
}

function toCanvas(img) {
  const scale = Math.min(3, Math.max(1, 1600 / Math.max(1, img.width)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { canvas, scale }
}

export async function ocrScheduleImage(file, { onProgress } = {}) {
  const Tesseract = await loadTesseract()
  const { img, url } = await readImage(file)
  let worker = null

  try {
    const { canvas, scale } = toCanvas(img)
    worker = await Tesseract.createWorker('eng', 1, {
      workerPath: `${ASSETS}worker.min.js`,
      corePath: ASSETS,
      langPath: ASSETS,
      gzip: true,
      cacheMethod: 'none',
      logger: onProgress ? m => {
        if (m.status === 'recognizing text') onProgress(m.progress ?? 0)
      } : undefined,
    })

    const { data } = await worker.recognize(canvas)
    const words = (data?.words ?? [])
      .filter(w => (w.text ?? '').trim() && w.bbox)
      .map(w => ({
        text: w.text,
        x0: w.bbox.x0, x1: w.bbox.x1,
        y0: w.bbox.y0, y1: w.bbox.y1,
      }))

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const boxes = mergeAdjacentBoxes(detectBoxes(imageData))

    return {
      words,
      boxes,
      width: canvas.width,
      height: canvas.height,
      scale,
      text: data?.text ?? '',
    }
  } finally {
    // Always release the WASM heap, even if recognition threw.
    if (worker) await worker.terminate().catch(() => {})
    URL.revokeObjectURL(url)
    releaseOcr()
  }
}
