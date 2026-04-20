function canRegisterPwa() {
  return import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator
}

function getServiceWorkerUrl() {
  return `${import.meta.env.BASE_URL}sw.js`
}

export function registerPwa() {
  if (!canRegisterPwa()) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(getServiceWorkerUrl())
  })
}
