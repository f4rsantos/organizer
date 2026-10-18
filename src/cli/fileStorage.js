export function createFileStorage({ read, write }) {
  const map = new Map(Object.entries(read() ?? {}))
  const flush = () => write(Object.fromEntries(map))
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); flush() },
    removeItem: key => { map.delete(key); flush() },
    clear: () => { map.clear(); flush() },
    key: index => [...map.keys()][index] ?? null,
    get length() { return map.size },
  }
}
