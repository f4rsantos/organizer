import { getSecureBaseUrl } from '../urlBase'

export function buildInviteLink({ projectId, apiKey, teamId, token, teamKey }) {
  const base = getSecureBaseUrl()
  const params = new URLSearchParams()
  params.set('oc_p', projectId)
  params.set('oc_k', apiKey)
  params.set('oc_t', teamId)
  params.set('oc_s', token)
  // The team key rides in the fragment: browsers never send it to a server,
  // so it stays out of access logs, referrers and Firestore itself.
  const fragment = teamKey ? `#oc_e=${encodeURIComponent(teamKey)}` : ''
  return `${base}?${params.toString()}${fragment}`
}

function readTeamKey(url) {
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  if (!hash) return null
  return new URLSearchParams(hash).get('oc_e')
}

export function parseInviteLink(raw) {
  try {
    const url = new URL(raw)
    const projectId = url.searchParams.get('oc_p')
    const apiKey = url.searchParams.get('oc_k')
    const teamId = url.searchParams.get('oc_t')
    const token = url.searchParams.get('oc_s')
    if (!projectId || !apiKey || !teamId || !token) return null
    return { projectId, apiKey, teamId, token, teamKey: readTeamKey(url) }
  } catch {
    return null
  }
}
