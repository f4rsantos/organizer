const callbacks = new Map()
let worker = null
let nextId = 1

function startWorker() {
  if (typeof Worker === 'undefined') return false
  try {
    const started = new Worker(new URL('./wakeTimerWorker.js', import.meta.url), { type: 'module' })
    started.onmessage = event => {
      const id = event.data?.id
      const callback = callbacks.get(id)
      callbacks.delete(id)
      callback?.()
    }
    return started
  } catch {
    return false
  }
}

function getWorker() {
  if (worker === null) worker = startWorker()
  return worker
}

export function scheduleWake(atMs, callback) {
  const delay = Math.max(0, atMs - Date.now())
  const activeWorker = getWorker()
  if (!activeWorker) {
    const timer = setTimeout(callback, delay)
    return () => clearTimeout(timer)
  }

  const id = nextId++
  callbacks.set(id, callback)
  activeWorker.postMessage({ type: 'schedule', id, delay })
  return () => {
    callbacks.delete(id)
    activeWorker.postMessage({ type: 'cancel', id })
  }
}
