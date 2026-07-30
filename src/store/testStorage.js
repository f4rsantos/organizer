const DB_NAME = 'organizer-state'
const STORE = 'state'
const RECORD_ID = 'container'

export function createLocalStorage() {
  const map = new Map()
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    clear: () => map.clear(),
    key: i => [...map.keys()][i] ?? null,
    get length() { return map.size },
    _map: map,
  }
}

export function resetStateDb() {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    const open = indexedDB.open(DB_NAME)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.close()
        resolve()
        return
      }
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); resolve() }
      tx.onabort = () => { db.close(); resolve() }
    }
    open.onerror = () => resolve()
    open.onblocked = () => resolve()
  })
}

export function readStoredContainer() {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    const open = indexedDB.open(DB_NAME)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.close()
        resolve(null)
        return
      }
      const tx = db.transaction(STORE, 'readonly')
      const get = tx.objectStore(STORE).get(RECORD_ID)
      get.onsuccess = () => {
        const value = get.result ?? null
        db.close()
        resolve(value)
      }
      get.onerror = () => { db.close(); resolve(null) }
    }
    open.onerror = () => resolve(null)
  })
}

export async function readStoredRaw() {
  const container = await readStoredContainer()
  return container === null ? null : JSON.stringify(container)
}

export async function waitForWrite(predicate = () => true, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2))
    const container = await readStoredContainer()
    if (container && predicate(container)) return container
  }
  return readStoredContainer()
}
