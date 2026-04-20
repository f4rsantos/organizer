function getSecureBaseUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (!isLocal) url.protocol = 'https:'
  return `${url.origin}${url.pathname}`
}

export function encodeStateToUrl(state) {
  const json = JSON.stringify(state)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  const url = `${getSecureBaseUrl()}#data=${b64}`
  return url
}

export function decodeStateFromUrl() {
  const hash = location.hash
  if (!hash.startsWith('#data=')) return null
  try {
    const b64 = hash.slice(6)
    const json = decodeURIComponent(escape(atob(b64)))
    const data = JSON.parse(json)
    if (!data.version) throw new Error('Invalid')
    return data
  } catch {
    return null
  }
}

export function clearUrlHash() {
  history.replaceState(null, '', location.pathname)
}
