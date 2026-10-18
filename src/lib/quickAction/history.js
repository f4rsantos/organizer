export function pushHistory(history, entry, max) {
  const command = entry.trim()
  if (!command) return history
  return [command, ...history.filter(item => item !== command)].slice(0, max)
}
