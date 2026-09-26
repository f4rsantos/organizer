import { describe, it, expect } from 'vitest'
import { parseFirebaseConfig } from '@/lib/firebaseConfig'

const EXPECTED = {
  apiKey: 'AIzaSyA-123_abc',
  authDomain: 'demo-app.firebaseapp.com',
  projectId: 'demo-app',
  storageBucket: 'demo-app.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef',
}

describe('parseFirebaseConfig', () => {
  it('parses strict JSON', () => {
    expect(parseFirebaseConfig(JSON.stringify(EXPECTED))).toEqual(EXPECTED)
  })

  it('parses the full console snippet with imports, comments and trailing commas', () => {
    const snippet = `// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-123_abc",
  authDomain: "demo-app.firebaseapp.com",
  projectId: "demo-app",
  storageBucket: "demo-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);`
    expect(parseFirebaseConfig(snippet)).toEqual(EXPECTED)
  })

  it('accepts single quotes, CRLF line endings and no separators between lines', () => {
    const raw = "{\r\n apiKey:'AIzaSyA-123_abc'\r\nauthDomain : 'demo-app.firebaseapp.com'\r\n  projectId:'demo-app' }"
    expect(parseFirebaseConfig(raw)).toEqual({
      apiKey: EXPECTED.apiKey,
      authDomain: EXPECTED.authDomain,
      projectId: EXPECTED.projectId,
    })
  })

  it('normalizes smart quotes, non-breaking spaces and zero-width characters', () => {
    const raw = '\uFEFF{ \u201CapiKey\u201D:\u00A0\u201CAIzaSyA-123_abc\u201D,\u200B \u2018projectId\u2019: \u2018demo-app\u2019 }'
    expect(parseFirebaseConfig(raw)).toEqual({ apiKey: EXPECTED.apiKey, projectId: EXPECTED.projectId })
  })

  it('strips whitespace that wrapped inside a value', () => {
    const raw = 'apiKey: "AIzaSyA-\n   123_abc", projectId: "demo-app"'
    expect(parseFirebaseConfig(raw)).toEqual({ apiKey: EXPECTED.apiKey, projectId: EXPECTED.projectId })
  })

  it('accepts env-style assignments and bare values', () => {
    const raw = 'apiKey=AIzaSyA-123_abc\nprojectId = demo-app'
    expect(parseFirebaseConfig(raw)).toEqual({ apiKey: EXPECTED.apiKey, projectId: EXPECTED.projectId })
  })

  it('ignores unknown keys', () => {
    const raw = '{ "apiKey": "k", "projectId": "p", "evil": "x" }'
    expect(parseFirebaseConfig(raw)).toEqual({ apiKey: 'k', projectId: 'p' })
  })

  it('does not confuse a key name appearing inside another value', () => {
    const raw = '{ storageBucket: "projectId.appspot.com", apiKey: "k", projectId: "real" }'
    expect(parseFirebaseConfig(raw).projectId).toBe('real')
  })

  it('returns null when apiKey or projectId is missing', () => {
    expect(parseFirebaseConfig('{ "apiKey": "k" }')).toBeNull()
    expect(parseFirebaseConfig('')).toBeNull()
    expect(parseFirebaseConfig(null)).toBeNull()
  })
})
