const WEB_ORIGIN = 'https://f4rsantos.github.io/organizer/'

function isNativeBuild() {
  return typeof __NATIVE_BUILD__ !== 'undefined' && __NATIVE_BUILD__ === true
}

export function getSecureBaseUrl() {
  if (isNativeBuild()) return WEB_ORIGIN
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (!isLocal) url.protocol = 'https:'
  return `${url.origin}${url.pathname}`
}
