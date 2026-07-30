function canRegisterPwa() {
  return import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator
}

function getServiceWorkerUrl() {
  return `${import.meta.env.BASE_URL}sw.js`
}

export function registerPwa() {
  if (!canRegisterPwa()) return

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  const doRegister = async () => {
    try {
      const registration = await navigator.serviceWorker.register(getServiceWorkerUrl(), {
        updateViaCache: 'none',
      })

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {})
        }
      })

      setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 60 * 1000)
    } catch {
      // app works without PWA features
    }
  }

  if (document.readyState === 'complete') {
    void doRegister()
  } else {
    window.addEventListener('load', () => void doRegister())
  }
}
