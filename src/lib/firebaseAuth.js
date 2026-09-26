import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'

const AUTH_PERSISTENCE = [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]

export function getAnonymousAuth(app) {
  try {
    return initializeAuth(app, { persistence: AUTH_PERSISTENCE })
  } catch {
    return getAuth(app)
  }
}
