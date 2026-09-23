const timers = new Map()

self.onmessage = event => {
  const { type, id, delay } = event.data ?? {}
  if (type === 'schedule') {
    timers.set(id, setTimeout(() => {
      timers.delete(id)
      self.postMessage({ id })
    }, delay))
    return
  }
  if (type === 'cancel') {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }
}
