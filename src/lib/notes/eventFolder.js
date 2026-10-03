import { nanoid } from '@/lib/ids'

const DEFAULT_SERIES_FOLDER_NAME = 'Event'

function folderNameKey(name) {
  return String(name ?? '').trim().toLocaleLowerCase()
}

function findFolderByName(folders, name) {
  const key = folderNameKey(name)
  if (!key) return null
  const matches = folders.filter(f => folderNameKey(f.name) === key)
  return matches.find(f => !f.parentId) ?? matches[0] ?? null
}

export function resolveSeriesFolder(folders, seriesKey, seriesName) {
  const list = folders ?? []
  if (!seriesKey) return { folders: list, folderId: null }

  const existing = list.find(f => f.linkedSeriesKey === seriesKey) ?? findFolderByName(list, seriesName)
  if (existing) return { folders: list, folderId: existing.id }

  const folderId = nanoid()
  const order = list.reduce((m, f) => Math.min(m, f.order ?? 0), 0) - 1
  const created = {
    id: folderId, name: seriesName || DEFAULT_SERIES_FOLDER_NAME, parentId: null,
    order, linkedSeriesKey: seriesKey,
  }
  return { folders: [...list, created], folderId }
}
