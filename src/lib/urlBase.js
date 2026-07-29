export function getSecureBaseUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (!isLocal) url.protocol = 'https:'
  return `${url.origin}${url.pathname}`
}
