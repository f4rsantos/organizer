import { describe, it, expect } from 'vitest'
import { classifyFirebaseError, FIREBASE_ERROR } from '../../src/lib/firebaseErrors.js'

const withCode = code => Object.assign(new Error(code), { code })

describe('classifyFirebaseError', () => {
  it('flags anonymous sign-in being disabled or Authentication never set up', () => {
    expect(classifyFirebaseError(withCode('auth/operation-not-allowed'))).toBe(FIREBASE_ERROR.ANON_DISABLED)
    expect(classifyFirebaseError(withCode('auth/admin-restricted-operation'))).toBe(FIREBASE_ERROR.ANON_DISABLED)
    expect(classifyFirebaseError(withCode('auth/configuration-not-found'))).toBe(FIREBASE_ERROR.ANON_DISABLED)
  })

  it('flags a rejected api key in both legacy and current code shapes', () => {
    expect(classifyFirebaseError(withCode('auth/invalid-api-key'))).toBe(FIREBASE_ERROR.API_KEY)
    expect(classifyFirebaseError(withCode('auth/api-key-not-valid.-please-pass-a-valid-api-key.'))).toBe(FIREBASE_ERROR.API_KEY)
  })

  it('maps firestore codes to rules, missing database and network', () => {
    expect(classifyFirebaseError(withCode('permission-denied'))).toBe(FIREBASE_ERROR.RULES)
    expect(classifyFirebaseError(withCode('not-found'))).toBe(FIREBASE_ERROR.NO_DATABASE)
    expect(classifyFirebaseError(withCode('unavailable'))).toBe(FIREBASE_ERROR.NETWORK)
    expect(classifyFirebaseError(withCode('auth/network-request-failed'))).toBe(FIREBASE_ERROR.NETWORK)
  })

  it('falls back to unknown for missing or unrecognised codes', () => {
    expect(classifyFirebaseError(null)).toBe(FIREBASE_ERROR.UNKNOWN)
    expect(classifyFirebaseError(new Error('boom'))).toBe(FIREBASE_ERROR.UNKNOWN)
    expect(classifyFirebaseError(withCode('internal'))).toBe(FIREBASE_ERROR.UNKNOWN)
  })
})
