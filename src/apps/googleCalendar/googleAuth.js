const CLIENT_ID_KEY = 'f4rsantos.github.io/organizer:google-client-id'
const SCOPE = 'https://www.googleapis.com/auth/calendar'
const GSI_SRC = 'https://accounts.google.com/gsi/client'

// Access tokens are short-lived (~1h) and sensitive: kept only in module memory,
// never written to localStorage. A page refresh means re-auth (silently, if the
// user already granted consent, via GIS's prompt-less token flow).
let accessToken = null
let tokenExpiresAt = 0
let tokenClient = null
let gsiLoadPromise = null

export function loadGoogleClientId() {
  try {
    return localStorage.getItem(CLIENT_ID_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveGoogleClientId(clientId) {
  try {
    localStorage.setItem(CLIENT_ID_KEY, clientId.trim())
  } catch {
    // localStorage unavailable; id won't persist
  }
}

export function clearGoogleClientId() {
  try {
    localStorage.removeItem(CLIENT_ID_KEY)
  } catch {
    // localStorage unavailable; nothing to clean up
  }
  accessToken = null
  tokenExpiresAt = 0
  tokenClient = null
}

export function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken
  return null
}

export function clearAccessToken() {
  accessToken = null
  tokenExpiresAt = 0
}

function loadGsiScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gsiLoadPromise) return gsiLoadPromise
  gsiLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('gsi-load-failed')))
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('gsi-load-failed'))
    document.head.appendChild(script)
  })
  return gsiLoadPromise
}

function ensureTokenClient(clientId) {
  if (tokenClient) return tokenClient
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: () => {},
  })
  return tokenClient
}

// prompt: '' lets GIS silently reuse an existing session/consent when possible;
// 'consent' forces the account chooser + consent screen (first connect).
export async function requestAccessToken({ prompt = '' } = {}) {
  const clientId = loadGoogleClientId()
  if (!clientId) throw new Error('missing-client-id')
  await loadGsiScript()
  const client = ensureTokenClient(clientId)
  return new Promise((resolve, reject) => {
    client.callback = resp => {
      if (resp.error) { reject(new Error(resp.error)); return }
      accessToken = resp.access_token
      tokenExpiresAt = Date.now() + (Number(resp.expires_in ?? 3600) - 60) * 1000
      resolve(accessToken)
    }
    try {
      client.requestAccessToken({ prompt })
    } catch (err) {
      reject(err)
    }
  })
}

export async function getOrRefreshAccessToken() {
  const cached = getAccessToken()
  if (cached) return cached
  return requestAccessToken({ prompt: '' })
}

export function disconnectGoogle() {
  const token = getAccessToken()
  clearAccessToken()
  clearGoogleClientId()
  if (token && window.google?.accounts?.oauth2) {
    try { window.google.accounts.oauth2.revoke(token, () => {}) } catch {
      // token is cleared locally either way
    }
  }
}
