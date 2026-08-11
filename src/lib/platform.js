export function isNativePlatform() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
}
