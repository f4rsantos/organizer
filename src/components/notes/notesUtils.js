export const EMPTY = []
export const ROOT = '__root__'

export function noteHasContent(note) {
  return Boolean(note?.body?.trim()) || (note?.strokes?.length ?? 0) > 0
}

export function noteOrder(a, b) {
  return (b.favorite - a.favorite) || ((a.order ?? 0) - (b.order ?? 0)) || (b.updatedAt - a.updatedAt)
}

export function folderOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
}

export function sortMosaicItems(folders, notes) {
  const folderItems = (folders ?? []).map(f => ({ ...f, itemType: 'folder' }))
  const noteItems = (notes ?? []).map(n => ({ ...n, itemType: 'note' }))
  return [...folderItems, ...noteItems].sort((a, b) => {
    const orderA = a.order ?? 0
    const orderB = b.order ?? 0
    if (orderA !== orderB) return orderA - orderB
    if (a.itemType !== b.itemType) return a.itemType === 'folder' ? -1 : 1
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  })
}

export function buildFolderTrail(folders, currentFolderId) {
  const trail = []
  let cursor = currentFolderId
  while (cursor) {
    const folder = folders.find(f => f.id === cursor)
    if (!folder) break
    trail.unshift(folder)
    cursor = folder.parentId ?? null
  }
  return trail
}

export function formatFolderNoteCount(count, t) {
  if (count === 0) return t.notesEmptyFolder || '0 notes'
  const unit = count === 1 ? (t.noteWordsSingle || 'note') : (t.notes || 'notes')
  return `${count} ${unit}`
}

export function computeReorderTarget(itemIds, activeId, overId, action) {
  const from = itemIds.indexOf(activeId)
  let to = itemIds.indexOf(overId)
  if (action === 'reorder_right' && to < from) {
    to = Math.min(itemIds.length - 1, to + 1)
  } else if (action === 'reorder_left' && to > from) {
    to = Math.max(0, to - 1)
  }
  return { from, to }
}

export function reorderArray(items, from, to) {
  if (from === -1 || to === -1 || from === to) return items
  const next = [...items]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}

export function resolveFolderHoverAction({
  folderId,
  rect,
  px,
  cx,
  lastX,
  dragDirection,
  folderEntryMap,
}) {
  if (!folderEntryMap[folderId]) {
    if (dragDirection === 'left' || (lastX !== null && px < lastX)) {
      folderEntryMap[folderId] = 'right'
    } else if (dragDirection === 'right' || (lastX !== null && px > lastX)) {
      folderEntryMap[folderId] = 'left'
    } else {
      folderEntryMap[folderId] = cx > (rect.left + rect.right) / 2 ? 'right' : 'left'
    }
  }

  const entrySide = folderEntryMap[folderId]
  const refX = (px >= rect.left && px <= rect.right) ? px : cx
  const left10 = rect.left + rect.width * 0.1
  const right10 = rect.right - rect.width * 0.1

  if (entrySide === 'right') {
    if (refX < left10) return 'reorder_left'
    return 'move_inside'
  } else {
    if (refX > right10) return 'reorder_right'
    return 'move_inside'
  }
}
