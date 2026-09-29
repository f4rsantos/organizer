export const FIREBASE_ERROR = {
  ANON_DISABLED: 'anon-disabled',
  API_KEY: 'api-key',
  APP_ID_MISSING: 'app-id-missing',
  RULES: 'rules',
  NO_DATABASE: 'no-database',
  NETWORK: 'network',
  UNKNOWN: 'unknown',
}

const ANON_DISABLED_CODES = [
  'auth/operation-not-allowed',
  'auth/admin-restricted-operation',
  'auth/configuration-not-found',
]
const RULES_CODES = [
  'permission-denied',
  'unauthenticated',
  'firestore/permission-denied',
  'firestore/unauthenticated',
  'sync-rules-outdated',
]
const NO_DATABASE_CODES = ['not-found', 'firestore/not-found']
const NETWORK_CODES = [
  'unavailable',
  'deadline-exceeded',
  'firestore/unavailable',
  'firestore/deadline-exceeded',
  'auth/network-request-failed',
]

export function classifyFirebaseError(error) {
  const code = String(error?.code ?? '').toLowerCase()
  if (!code) return FIREBASE_ERROR.UNKNOWN
  if (ANON_DISABLED_CODES.includes(code)) return FIREBASE_ERROR.ANON_DISABLED
  if (code === 'sync-app-id-missing') return FIREBASE_ERROR.APP_ID_MISSING
  if (code.startsWith('auth/') && code.includes('api-key')) return FIREBASE_ERROR.API_KEY
  if (RULES_CODES.includes(code)) return FIREBASE_ERROR.RULES
  if (NO_DATABASE_CODES.includes(code)) return FIREBASE_ERROR.NO_DATABASE
  if (NETWORK_CODES.includes(code)) return FIREBASE_ERROR.NETWORK
  return FIREBASE_ERROR.UNKNOWN
}

const ERROR_STRING_KEYS = {
  [FIREBASE_ERROR.ANON_DISABLED]: 'firebaseErrAnonDisabled',
  [FIREBASE_ERROR.API_KEY]: 'firebaseErrApiKey',
  [FIREBASE_ERROR.APP_ID_MISSING]: 'firebaseErrAppIdMissing',
  [FIREBASE_ERROR.RULES]: 'firebaseErrRules',
  [FIREBASE_ERROR.NO_DATABASE]: 'firebaseErrNoDatabase',
  [FIREBASE_ERROR.NETWORK]: 'firebaseErrNetwork',
}

export function describeFirebaseError(error, t) {
  const key = ERROR_STRING_KEYS[classifyFirebaseError(error)]
  if (key) return t[key]
  return error?.code ? `${t.firebaseTestFailed} (${error.code})` : t.firebaseTestFailed
}
