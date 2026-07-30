import { randomBytes, bytesToHex } from './bytes'

const DB_NAME = 'organizer-keys'
const DB_VERSION = 1
const STORE = 'keys'
const DEK_ID = 'dek'
const ALGO = 'AES-GCM'
const KEY_BYTES = 32
const DEK_ID_BYTES = 8

let dbPromise = null
let cachedDek = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('key-store-unavailable'))
      return
    }
    let request
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      reject(new Error('key-store-unavailable'))
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('key-store-unavailable'))
    request.onblocked = () => reject(new Error('key-store-unavailable'))
  })
  dbPromise = dbPromise.catch(err => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

function runTransaction(mode, run) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const fail = () => reject(new Error('key-store-unavailable'))
    let tx
    try {
      tx = db.transaction(STORE, mode)
    } catch {
      fail()
      return
    }
    let result
    const request = run(tx.objectStore(STORE))
    if (request) {
      request.onsuccess = () => { result = request.result }
      request.onerror = fail
    }
    tx.oncomplete = () => resolve(result)
    tx.onabort = fail
    tx.onerror = fail
  }))
}

export function openDekStore() {
  return openDb().then(() => undefined)
}

export async function importDekFromRaw(raw) {
  return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt'])
}

export async function computeDekId(raw) {
  const digest = await crypto.subtle.digest('SHA-256', raw)
  return bytesToHex(new Uint8Array(digest).slice(0, DEK_ID_BYTES))
}

export function generateDekBytes() {
  return randomBytes(KEY_BYTES)
}

export async function getDek() {
  if (cachedDek) return cachedDek
  const stored = await runTransaction('readonly', store => store.get(DEK_ID))
  cachedDek = stored ?? null
  return cachedDek
}

export async function putDek(cryptoKey) {
  await runTransaction('readwrite', store => store.put(cryptoKey, DEK_ID))
  cachedDek = cryptoKey
}

export async function clearDek() {
  cachedDek = null
  await runTransaction('readwrite', store => store.delete(DEK_ID))
}

export function setCachedDek(cryptoKey) {
  cachedDek = cryptoKey
}

export function getCachedDek() {
  return cachedDek
}

export function closeDekStore() {
  const pending = dbPromise
  dbPromise = null
  cachedDek = null
  if (!pending) return Promise.resolve()
  return pending.then(db => db.close(), () => undefined)
}
