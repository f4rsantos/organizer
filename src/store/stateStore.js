const DB_NAME = 'organizer-state'
const DB_VERSION = 1
const STORE = 'state'
const RECORD_ID = 'container'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('state-store-unavailable'))
      return
    }
    let request
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      reject(new Error('state-store-unavailable'))
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('state-store-unavailable'))
    request.onblocked = () => reject(new Error('state-store-unavailable'))
  })
  dbPromise = dbPromise.catch(err => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

function runTransaction(mode, run) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const fail = () => reject(new Error('state-store-unavailable'))
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

export function readContainer() {
  return runTransaction('readonly', store => store.get(RECORD_ID))
    .then(value => value ?? null)
}

export function writeContainerRecord(container) {
  return runTransaction('readwrite', store => store.put(container, RECORD_ID))
}

export function deleteContainerRecord() {
  return runTransaction('readwrite', store => store.delete(RECORD_ID))
}

export function isStateStoreAvailable() {
  return typeof indexedDB !== 'undefined'
}

export function resetStateStoreForTests() {
  dbPromise = null
}
