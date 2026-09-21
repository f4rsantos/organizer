const DB_NAME = 'organizer-ai-chats'
const DB_VERSION = 1
const STORE = 'chats'
const RETENTION_MS = 24 * 60 * 60 * 1000

let memoryFallback = new Map()
let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexeddb-unavailable'))
      return
    }
    let request
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      reject(new Error('indexeddb-unavailable'))
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('indexeddb-unavailable'))
    request.onblocked = () => reject(new Error('indexeddb-unavailable'))
  })
  dbPromise = dbPromise.catch(err => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

function runTransaction(mode, run) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const fail = () => reject(new Error('indexeddb-tx-failed'))
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

export async function saveChatSession(chat) {
  if (!chat || !chat.id) return null
  const now = Date.now()
  const toSave = {
    id: chat.id,
    title: chat.title || 'Chat',
    messages: chat.messages || [],
    updatedAt: chat.updatedAt || now,
    saved: chat.saved === true,
  }

  try {
    const existing = await getChatSession(chat.id)
    if (existing && chat.saved === undefined) {
      toSave.saved = existing.saved === true
    }
    await runTransaction('readwrite', store => store.put(toSave))
    return toSave
  } catch {
    memoryFallback.set(toSave.id, toSave)
    return toSave
  }
}

export async function getChatSession(id) {
  if (!id) return null
  try {
    return await runTransaction('readonly', store => store.get(id))
  } catch {
    return memoryFallback.get(id) || null
  }
}

export async function deleteChatSession(id) {
  if (!id) return
  try {
    await runTransaction('readwrite', store => store.delete(id))
  } catch {
    memoryFallback.delete(id)
  }
}

export async function toggleChatSaved(id) {
  const chat = await getChatSession(id)
  if (!chat) return null
  const updated = { ...chat, saved: !chat.saved }
  try {
    await runTransaction('readwrite', store => store.put(updated))
  } catch {
    memoryFallback.set(id, updated)
  }
  return updated
}

export async function loadChatSessions() {
  const cutoff = Date.now() - RETENTION_MS
  let all = []
  try {
    all = (await runTransaction('readonly', store => store.getAll())) || []
  } catch {
    all = Array.from(memoryFallback.values())
  }

  const toKeep = []
  const toDelete = []

  for (const chat of all) {
    if (chat.saved || chat.updatedAt >= cutoff) {
      toKeep.push(chat)
    } else {
      toDelete.push(chat.id)
    }
  }

  for (const id of toDelete) {
    deleteChatSession(id).catch(() => {})
  }

  return toKeep.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function clearMemoryFallback() {
  memoryFallback = new Map()
  dbPromise = null
}
