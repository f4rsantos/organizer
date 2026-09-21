import { showBrowserNotification } from './permission'

export async function playNotificationPing() {
  let Howler
  try {
    ({ Howler } = await import('howler'))
  } catch {
    return
  }

  const ctx = Howler.ctx
  if (!ctx) return

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ctx.currentTime)

  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.23)
}

export function vibrateWithPattern(pattern) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}

export function dispatchNotification({ settings, title, body, tag, renotify = false, vibratePattern = 24 }) {
  if (!settings) return

  if (settings.vibrate) {
    vibrateWithPattern(vibratePattern)
  }

  if (settings.sound) {
    void playNotificationPing()
  }

  if (settings.browserPush) {
    showBrowserNotification({ title, body, tag, renotify })
  }
}
