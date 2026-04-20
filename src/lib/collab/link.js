function getSecureBaseUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (!isLocal) url.protocol = 'https:'
  return `${url.origin}${url.pathname}`
}

export function buildInviteLink({ projectId, apiKey, teamId, token }) {
  const base = getSecureBaseUrl()
  const params = new URLSearchParams()
  params.set('oc_p', projectId)
  params.set('oc_k', apiKey)
  params.set('oc_t', teamId)
  params.set('oc_s', token)
  return `${base}?${params.toString()}`
}

export function parseInviteLink(raw) {
  try {
    const url = new URL(raw)
    const projectId = url.searchParams.get('oc_p')
    const apiKey = url.searchParams.get('oc_k')
    const teamId = url.searchParams.get('oc_t')
    const token = url.searchParams.get('oc_s')
    if (!projectId || !apiKey || !teamId || !token) return null
    return { projectId, apiKey, teamId, token }
  } catch {
    return null
  }
}
