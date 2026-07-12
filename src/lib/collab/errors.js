export function classifyCollabError(error) {
  const code = String(error?.code ?? '').toLowerCase()
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'permission'
  const message = String(error?.message ?? '')
  if (message === 'Team not found') return 'not-found'
  if (message === 'Invite expired') return 'invite-expired'
  if (message === 'Invalid invite') return 'invite-invalid'
  return 'generic'
}

export function collabErrorTextForCode(code, t, fallback) {
  switch (code) {
    case 'permission': return t.collabErrorPermission
    case 'not-found': return t.collabErrorNotFound
    case 'invite-expired': return t.collabErrorInviteExpired
    case 'invite-invalid': return t.collabErrorInviteInvalid
    default: return fallback
  }
}

export function collabErrorText(err, t, fallback) {
  return collabErrorTextForCode(classifyCollabError(err), t, fallback)
}
