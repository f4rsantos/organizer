export function hasDeviceOrientationSupport() {
  return typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined'
}

export function requiresDeviceOrientationPermission() {
  return hasDeviceOrientationSupport() && typeof window.DeviceOrientationEvent.requestPermission === 'function'
}

function currentScreenAngle() {
  if (typeof window === 'undefined') return 0
  if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
    return window.screen.orientation.angle
  }
  if (typeof window.orientation === 'number') return window.orientation
  return 0
}

export function gravityFromDeviceOrientation(event, screenAngle = currentScreenAngle()) {
  const { beta, gamma } = event
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null

  const betaRad = (beta * Math.PI) / 180
  const gammaRad = (gamma * Math.PI) / 180

  let gx = Math.sin(gammaRad) * Math.cos(betaRad)
  let gy = Math.sin(betaRad)

  const angle = ((screenAngle % 360) + 360) % 360
  if (angle === 90) {
    const rotated = { x: -gy, y: gx }
    gx = rotated.x
    gy = rotated.y
  } else if (angle === 180) {
    gx = -gx
    gy = -gy
  } else if (angle === 270) {
    const rotated = { x: gy, y: -gx }
    gx = rotated.x
    gy = rotated.y
  }

  const mag = Math.sqrt(gx * gx + gy * gy)
  if (mag > 1) { gx /= mag; gy /= mag }

  return { x: gx, y: Math.max(gy, -1) }
}

export function createGravitySensor() {
  const gravity = { x: 0, y: 1 }
  let enabled = false
  let handler = null

  function handleOrientation(event) {
    const next = gravityFromDeviceOrientation(event)
    if (next) { gravity.x = next.x; gravity.y = next.y }
  }

  function enable() {
    if (enabled || !hasDeviceOrientationSupport()) return false
    handler = handleOrientation
    window.addEventListener('deviceorientation', handler)
    enabled = true
    return true
  }

  async function requestAccess() {
    if (!hasDeviceOrientationSupport()) return false
    if (!requiresDeviceOrientationPermission()) return enable()

    try {
      const permission = await window.DeviceOrientationEvent.requestPermission()
      if (permission !== 'granted') return false
      return enable()
    } catch {
      return false
    }
  }

  function teardown() {
    if (handler) window.removeEventListener('deviceorientation', handler)
    handler = null
    enabled = false
  }

  return { gravity, enable, requestAccess, teardown, isEnabled: () => enabled }
}
