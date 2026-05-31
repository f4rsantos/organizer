import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore'

const PRESETS_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_PRESETS_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_PRESETS_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PRESETS_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_PRESETS_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_PRESETS_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_PRESETS_FIREBASE_APP_ID,
}

function getPresetsApp() {
  if (!PRESETS_FIREBASE_CONFIG.projectId) return null
  const existing = getApps().find(a => a.name === 'presets')
  if (existing) return existing
  return initializeApp(PRESETS_FIREBASE_CONFIG, 'presets')
}

export async function fetchPresetFromFirebase(key) {
  try {
    const app = getPresetsApp()
    if (!app) return null
    const db = getFirestore(app)
    const snap = await getDoc(doc(db, 'presets', key))
    if (!snap.exists()) return null
    const { updatedAt = 0, ...rest } = snap.data()
    return { updatedAt, data: rest }
  } catch {
    return null
  }
}

export async function fetchPresetMetaFromFirebase(key) {
  try {
    const app = getPresetsApp()
    if (!app) return null
    const db = getFirestore(app)
    const snap = await getDoc(doc(db, 'presets', key))
    if (!snap.exists()) return null
    const d = snap.data()
    return { key: d.key ?? key, updatedAt: d.updatedAt ?? 0 }
  } catch {
    return null
  }
}

export async function fetchAllPresetMetaFromFirebase() {
  try {
    const app = getPresetsApp()
    if (!app) return []
    const db = getFirestore(app)
    const snaps = await getDocs(collection(db, 'presets'))
    return snaps.docs.map(d => {
      const data = d.data()
      return { key: d.id, updatedAt: data.updatedAt ?? 0, name: data.name ?? d.id }
    })
  } catch {
    return []
  }
}

export async function checkPresetUpdateAvailable(key, storedUpdatedAt) {
  const meta = await fetchPresetMetaFromFirebase(key)
  if (!meta) return false
  if (storedUpdatedAt == null) return meta.updatedAt > 0
  return meta.updatedAt > storedUpdatedAt
}
